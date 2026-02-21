/**
 * CAP CDS Tool Definitions
 *
 * Each tool has:
 *  - name: MCP tool name (prefixed with cap_)
 *  - description: what the tool does
 *  - inputSchema: JSON Schema for parameters
 *  - handler: async function that executes the tool
 *
 * Execution strategy: Hybrid
 *  - In-process: cds compile (fast model introspection, <100ms)
 *  - Shell out:  cds build, cds deploy, cf commands (long-running ops)
 */

import { executeShell, executeCds, getCompiledModel, clearCsnCache } from './cds-executor.js';
import { formatMarkdownTable, formatEntityDetail, formatServiceList } from './output-formatter.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: Record<string, any>, cwd: string) => Promise<string>;
}

// ─── Model Introspection Tools ───────────────────────────────

const capEntities: ToolDefinition = {
  name: 'cap_entities',
  description:
    'List all CDS entities in the CAP project with their key fields, element count, and association/composition counts. ' +
    'Useful for understanding the data model at a glance.',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: {
        type: 'string',
        description: 'Filter entities by namespace prefix (e.g., "flights")',
      },
      includeViews: {
        type: 'boolean',
        description: 'Include CDS view entities (default: true)',
        default: true,
      },
    },
  },
  handler: async (args, cwd) => {
    const csn = await getCompiledModel(cwd);
    const model = JSON.parse(csn);
    const defs = model.definitions || {};

    const entities: Array<{
      name: string;
      kind: string;
      keys: string[];
      elements: number;
      associations: number;
      compositions: number;
    }> = [];

    for (const [name, def] of Object.entries(defs) as Array<[string, any]>) {
      if (def.kind !== 'entity') continue;
      if (args.namespace && !name.startsWith(args.namespace)) continue;

      const isView = !!def.query;
      if (!args.includeViews && args.includeViews !== undefined && isView) continue;

      const elements = def.elements || {};
      const keys: string[] = [];
      let assocCount = 0;
      let compCount = 0;

      for (const [elemName, elem] of Object.entries(elements) as Array<[string, any]>) {
        if (elem.key) keys.push(elemName);
        if (elem.type === 'cds.Association') assocCount++;
        if (elem.type === 'cds.Composition') compCount++;
      }

      entities.push({
        name,
        kind: isView ? 'view' : 'entity',
        keys,
        elements: Object.keys(elements).length,
        associations: assocCount,
        compositions: compCount,
      });
    }

    if (entities.length === 0) return 'No entities found.';

    const headers = ['Entity', 'Kind', 'Keys', '#Elements', '#Assoc', '#Comp'];
    const rows = entities.map((e) => [
      e.name,
      e.kind,
      e.keys.join(', '),
      String(e.elements),
      String(e.associations),
      String(e.compositions),
    ]);

    return `## CDS Entities\n\n**Total:** ${entities.length}\n\n` + formatMarkdownTable(headers, rows);
  },
};

const capEntityDetail: ToolDefinition = {
  name: 'cap_entity_detail',
  description:
    'Get the full definition of a specific CDS entity including all fields with types, ' +
    'associations, compositions, and their ON conditions. Essential for understanding entity structure.',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Fully qualified entity name (e.g., "flights.Carriers" or just "Carriers")',
      },
    },
    required: ['entity'],
  },
  handler: async (args, cwd) => {
    const csn = await getCompiledModel(cwd);
    const model = JSON.parse(csn);
    const defs = model.definitions || {};

    // Find entity by exact name or suffix match
    let entityDef: any = null;
    let entityName = '';
    for (const [name, def] of Object.entries(defs) as Array<[string, any]>) {
      if (def.kind !== 'entity') continue;
      if (name === args.entity || name.endsWith(`.${args.entity}`)) {
        entityDef = def;
        entityName = name;
        break;
      }
    }

    if (!entityDef) return `Entity "${args.entity}" not found.`;

    return formatEntityDetail(entityName, entityDef);
  },
};

const capAssociations: ToolDefinition = {
  name: 'cap_associations',
  description:
    'List all associations and compositions across the entire CDS model or for a specific entity. ' +
    'Shows source entity, target entity, cardinality, and type (Association vs Composition).',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Filter to a specific entity (optional). If omitted, shows all.',
      },
    },
  },
  handler: async (args, cwd) => {
    const csn = await getCompiledModel(cwd);
    const model = JSON.parse(csn);
    const defs = model.definitions || {};

    const relations: Array<{
      source: string;
      field: string;
      type: string;
      target: string;
      cardinality: string;
    }> = [];

    for (const [name, def] of Object.entries(defs) as Array<[string, any]>) {
      if (def.kind !== 'entity') continue;
      if (args.entity && name !== args.entity && !name.endsWith(`.${args.entity}`)) continue;

      for (const [elemName, elem] of Object.entries(def.elements || {}) as Array<[string, any]>) {
        if (elem.type === 'cds.Association' || elem.type === 'cds.Composition') {
          const card = elem.cardinality;
          let cardStr = 'to one';
          if (card && card.max === '*') cardStr = 'to many';

          relations.push({
            source: name.split('.').pop() || name,
            field: elemName,
            type: elem.type === 'cds.Composition' ? 'Composition' : 'Association',
            target: (elem.target || '').split('.').pop() || elem.target,
            cardinality: cardStr,
          });
        }
      }
    }

    if (relations.length === 0) return 'No associations found.';

    const headers = ['Source', 'Field', 'Type', 'Target', 'Cardinality'];
    const rows = relations.map((r) => [r.source, r.field, r.type, r.target, r.cardinality]);

    return `## Associations & Compositions\n\n**Total:** ${relations.length}\n\n` + formatMarkdownTable(headers, rows);
  },
};

const capServices: ToolDefinition = {
  name: 'cap_services',
  description:
    'List all CDS service definitions with their paths, entity counts, and function/action counts.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, cwd) => {
    const csn = await getCompiledModel(cwd);
    const model = JSON.parse(csn);
    return formatServiceList(model);
  },
};

// ─── Schema & Compilation Tools ─────────────────────────────

const capCompile: ToolDefinition = {
  name: 'cap_compile',
  description:
    'Compile CDS model to various output formats: json (CSN), edm/edmx (OData metadata), ' +
    'sql (DDL statements), hdbcds, hdbtable. Powerful for inspecting the compiled output.',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Output format',
        enum: ['json', 'edm', 'edmx', 'sql', 'hdbcds', 'hdbtable', 'yaml'],
        default: 'json',
      },
      source: {
        type: 'string',
        description: 'Source CDS file to compile (default: entire project)',
      },
    },
  },
  handler: async (args, cwd) => {
    const format = args.format || 'json';
    const cmdArgs = ['--to', format];
    if (args.source) cmdArgs.unshift(args.source);

    const output = await executeCds('compile', cmdArgs, cwd);

    // Truncate very large outputs
    if (output.length > 50000) {
      return output.slice(0, 50000) + '\n\n... (truncated, output exceeds 50KB)';
    }
    return output;
  },
};

const capEdm: ToolDefinition = {
  name: 'cap_edm',
  description:
    'Generate OData V4 EDMX metadata for the service. Shows all EntitySets, NavigationPropertyBindings, ' +
    'EntityTypes with their properties — the full OData contract.',
  inputSchema: {
    type: 'object',
    properties: {
      service: {
        type: 'string',
        description: 'Service CDS file (default: auto-detected from srv/)',
      },
    },
  },
  handler: async (args, cwd) => {
    const source = args.service || '';
    const cmdArgs = source ? [source, '--to', 'edm'] : ['--to', 'edm'];
    const output = await executeCds('compile', cmdArgs, cwd);

    if (output.length > 50000) {
      return output.slice(0, 50000) + '\n\n... (truncated)';
    }
    return '## OData V4 Metadata (EDMX)\n\n```json\n' + output + '\n```';
  },
};

// ─── Data Inspection Tools ──────────────────────────────────

const capCsvInspect: ToolDefinition = {
  name: 'cap_csv_inspect',
  description:
    'Inspect CSV seed data files in the db/data/ directory. Lists available CSV files, ' +
    'row counts, and can preview the first N rows of a specific file.',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: 'Specific CSV filename to inspect (e.g., "flights-Carriers.csv"). If omitted, lists all files.',
      },
      rows: {
        type: 'number',
        description: 'Number of rows to preview (default: 5)',
        default: 5,
      },
    },
  },
  handler: async (args, cwd) => {
    if (args.file) {
      const output = await executeShell(`head -${(args.rows || 5) + 1} "db/data/${args.file}"`, cwd);
      const lines = output.trim().split('\n');
      if (lines.length === 0) return `File "${args.file}" is empty or not found.`;

      const headers = lines[0].split(';').length > 1
        ? lines[0].split(';')
        : lines[0].split(',');
      const dataRows = lines.slice(1).map((line) => {
        const sep = line.includes(';') ? ';' : ',';
        return line.split(sep);
      });

      return `## ${args.file}\n\n**Columns:** ${headers.length}\n**Preview rows:** ${dataRows.length}\n\n` +
        formatMarkdownTable(headers.map((h) => h.trim()), dataRows.map((r) => r.map((c) => c.trim())));
    }

    // List all CSV files with row counts
    const output = await executeShell('for f in db/data/*.csv; do echo "$(wc -l < "$f" | tr -d " ") $(basename "$f")"; done 2>/dev/null', cwd);
    if (!output.trim()) return 'No CSV files found in db/data/';

    const files = output.trim().split('\n').map((line) => {
      const [count, name] = line.trim().split(' ', 2);
      return [name || '', String(Math.max(0, parseInt(count || '0', 10) - 1)) + ' rows'];
    });

    return '## CSV Seed Data Files\n\n' + formatMarkdownTable(['File', 'Data Rows'], files);
  },
};

// ─── Project Management Tools ───────────────────────────────

const capProjectInfo: ToolDefinition = {
  name: 'cap_project_info',
  description:
    'Get comprehensive CAP project information: package.json metadata, CDS configuration, ' +
    'MTA modules, service bindings, and dependency versions.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, cwd) => {
    const output = await executeCds('env', [], cwd);
    const pkgJson = await executeShell('cat package.json', cwd);

    let result = '## CAP Project Info\n\n';

    try {
      const pkg = JSON.parse(pkgJson);
      result += `**Name:** ${pkg.name}\n`;
      result += `**Version:** ${pkg.version}\n`;
      result += `**Description:** ${pkg.description || 'N/A'}\n\n`;

      result += '### Dependencies\n\n';
      for (const [dep, ver] of Object.entries(pkg.dependencies || {})) {
        result += `- ${dep}: ${ver}\n`;
      }
      result += '\n';
    } catch {
      result += '*Could not parse package.json*\n\n';
    }

    result += '### CDS Environment\n\n```\n' + output.slice(0, 10000) + '\n```';
    return result;
  },
};

const capMtaInfo: ToolDefinition = {
  name: 'cap_mta_info',
  description:
    'Parse and display the MTA deployment descriptor (mta.yaml). Shows modules, resources, ' +
    'service bindings, and deployment configuration.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, cwd) => {
    const output = await executeShell('cat mta.yaml 2>/dev/null || echo "No mta.yaml found"', cwd);

    if (output.includes('No mta.yaml found')) return output;

    return '## MTA Deployment Descriptor\n\n```yaml\n' + output + '\n```';
  },
};

const capBuild: ToolDefinition = {
  name: 'cap_build',
  description:
    'Run CDS build (production or development). Compiles CDS models to deployment artifacts ' +
    '(hdbtable, hdbview, etc. for HANA; or sqlite for local).',
  inputSchema: {
    type: 'object',
    properties: {
      production: {
        type: 'boolean',
        description: 'Build for production (default: false)',
        default: false,
      },
    },
  },
  handler: async (args, cwd) => {
    const cmdArgs = args.production ? ['--production'] : [];
    const output = await executeShell(`npx cds build ${cmdArgs.join(' ')}`, cwd);
    return '## CDS Build Output\n\n```\n' + output + '\n```';
  },
};

// ─── HANA Bridge Tools (complement hana-cli) ───────────────

const capToHanaMapping: ToolDefinition = {
  name: 'cap_hana_mapping',
  description:
    'Show the mapping between CDS entities and their generated HANA artifacts (hdbtable/hdbview names). ' +
    'Bridges the gap between CDS model and hana-cli commands.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, cwd) => {
    const csn = await getCompiledModel(cwd);
    const model = JSON.parse(csn);
    const defs = model.definitions || {};

    const mappings: Array<{ cds: string; hana: string; type: string }> = [];

    for (const [name, def] of Object.entries(defs) as Array<[string, any]>) {
      if (def.kind !== 'entity') continue;

      // CDS namespace.Entity → HANA namespace_Entity (dots become underscores)
      const hanaName = name.replace(/\./g, '_');
      const isView = !!def.query;

      mappings.push({
        cds: name,
        hana: hanaName,
        type: isView ? 'hdbview' : 'hdbtable',
      });
    }

    const headers = ['CDS Entity', 'HANA Artifact', 'Type'];
    const rows = mappings.map((m) => [m.cds, m.hana, m.type]);

    return `## CDS → HANA Mapping\n\n**Total artifacts:** ${mappings.length}\n\n` + formatMarkdownTable(headers, rows);
  },
};

const capQuery: ToolDefinition = {
  name: 'cap_query',
  description:
    'Execute a CQL or OData-style query against the running CAP service. ' +
    'Requires `cds watch` or `cds serve` to be running. ' +
    'Example: entity=Carriers, top=5, expand=CONNECTIONS',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Entity set name (e.g., "Carriers", "Flights")',
      },
      filter: {
        type: 'string',
        description: 'OData $filter expression (e.g., "CARRID eq \'LH\'")',
      },
      select: {
        type: 'string',
        description: 'OData $select fields (e.g., "CARRID,CARRNAME")',
      },
      expand: {
        type: 'string',
        description: 'OData $expand navigation (e.g., "CONNECTIONS,FLIGHTS")',
      },
      top: {
        type: 'number',
        description: 'Limit results (default: 10)',
        default: 10,
      },
      serviceUrl: {
        type: 'string',
        description: 'Base URL of running service (default: http://localhost:4004/odata/v4/flights)',
        default: 'http://localhost:4004/odata/v4/flights',
      },
    },
    required: ['entity'],
  },
  handler: async (args, cwd) => {
    const base = args.serviceUrl || 'http://localhost:4004/odata/v4/flights';
    let url = `${base}/${args.entity}?$top=${args.top || 10}`;

    if (args.filter) url += `&$filter=${encodeURIComponent(args.filter)}`;
    if (args.select) url += `&$select=${encodeURIComponent(args.select)}`;
    if (args.expand) url += `&$expand=${encodeURIComponent(args.expand)}`;

    try {
      const output = await executeShell(`curl -s "${url}"`, cwd);
      const data = JSON.parse(output);
      const count = data.value?.length ?? 0;

      return `## Query: ${args.entity}\n\n**Results:** ${count}\n\n\`\`\`json\n${JSON.stringify(data, null, 2).slice(0, 30000)}\n\`\`\``;
    } catch (error) {
      return `Query failed. Is the CAP server running? (cds watch)\n\nError: ${error}`;
    }
  },
};

// ─── Data Query Tools (SQL against in-memory SQLite) ────────

/**
 * Resolve the path to the query-runner.cjs script.
 * It ships alongside the MCP server build.
 */
function queryRunnerPath(): string {
  // Scripts live at the same level as src/ and build/
  const path = require('path');
  return path.resolve(__dirname, '..', 'scripts', 'query-runner.cjs');
}

const capCqlQuery: ToolDefinition = {
  name: 'cap_cql_query',
  description:
    'Execute a SQL query against the CAP project database (in-memory SQLite with all CSV seed data loaded). ' +
    'Use standard SQL syntax with table names following: namespace_EntityName pattern ' +
    '(e.g., flights_Flights, flights_Carriers, flights_Connections, flights_Bookings). ' +
    'Supports JOINs, GROUP BY, aggregations, subqueries — the full SQLite SQL dialect. ' +
    'Perfect for answering data questions like "flights to New York", "total occupancy by airline", "revenue by route".',
  inputSchema: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description:
          'SQL query. Table names use underscore pattern: flights_Flights, flights_Carriers, flights_Connections, ' +
          'flights_Bookings, flights_Customers, flights_Invoices, flights_Tickets, flights_Airports, etc. ' +
          'Key columns: Flights(CARRID, CONNID, FLDATE, PRICE, CURRENCY, PLANETYPE, SEATSMAX, SEATSOCC), ' +
          'Connections(CARRID, CONNID, CITYFROM, CITYTO, AIRPFROM, AIRPTO, DEPTIME, ARRTIME, DISTANCE), ' +
          'Carriers(CARRID, CARRNAME, CURRCODE), Bookings(CARRID, CONNID, FLDATE, BOOKID, CUSTOMID, ORDER_DATE), ' +
          'Customers(CUSTTYPE, DISCOUNT, FORM, NAME, CITY, COUNTRY, POSTCODE). All tables have MANDT key (use for JOINs).',
      },
      maxRows: {
        type: 'number',
        description: 'Maximum rows to return (default: 50, max: 500)',
        default: 50,
      },
    },
    required: ['sql'],
  },
  handler: async (args, cwd) => {
    const sql = args.sql.trim();
    const maxRows = Math.min(args.maxRows || 50, 500);
    const b64 = Buffer.from(sql).toString('base64');

    const output = await executeShell(
      `node "${queryRunnerPath()}" "${b64}" ${maxRows}`,
      cwd,
      15000
    );

    try {
      const result = JSON.parse(output.trim());
      if (result.error) return `**Query Error:** ${result.error}`;

      const { rows, count, truncated, query } = result;
      if (count === 0) return `No results for query:\n\`\`\`sql\n${query}\n\`\`\``;

      // Format as markdown table
      const headers = Object.keys(rows[0]);
      const tableRows = rows.map((r: any) =>
        headers.map((h) => {
          const v = r[h];
          return v === null ? 'NULL' : String(v);
        })
      );

      let md = `## Query Results\n\n**Rows:** ${count}${truncated ? ` (limited to ${maxRows})` : ''}\n\n`;
      md += '```sql\n' + query + '\n```\n\n';
      md += formatMarkdownTable(headers, tableRows);
      return md;
    } catch {
      return `**Raw output:**\n${output.slice(0, 5000)}`;
    }
  },
};

const capDataStats: ToolDefinition = {
  name: 'cap_data_stats',
  description:
    'Get row counts for all entities in the CAP project database. Shows which tables have data ' +
    'and how many rows each contains. Useful for understanding data volume and coverage before querying.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, cwd) => {
    const output = await executeShell(
      `node "${queryRunnerPath()}" --stats`,
      cwd,
      15000
    );

    try {
      const result = JSON.parse(output.trim());
      if (result.error) return `Error: ${result.error}`;

      const { entities, totalEntities } = result;
      const headers = ['Entity', 'SQL Table Name', 'Rows'];
      const rows = entities.map((e: any) => [e.entity, e.table, String(e.rows)]);

      return `## Data Statistics\n\n**Total entities with data:** ${totalEntities}\n\n` +
        formatMarkdownTable(headers, rows);
    } catch {
      return `Raw output:\n${output.slice(0, 5000)}`;
    }
  },
};

const capSampleData: ToolDefinition = {
  name: 'cap_sample_data',
  description:
    'Preview sample rows from any entity in the database. Shows column names and actual data values. ' +
    'Useful for understanding data format, checking column values, and building queries. ' +
    'Accepts short names like "Carriers" or full names like "flights.Carriers".',
  inputSchema: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'Entity name (e.g., "Carriers", "Flights", "Connections", "flights.Bookings")',
      },
      maxRows: {
        type: 'number',
        description: 'Number of sample rows (default: 5, max: 50)',
        default: 5,
      },
    },
    required: ['entity'],
  },
  handler: async (args, cwd) => {
    const maxRows = Math.min(args.maxRows || 5, 50);
    const output = await executeShell(
      `node "${queryRunnerPath()}" --sample "${args.entity}" ${maxRows}`,
      cwd,
      15000
    );

    try {
      const result = JSON.parse(output.trim());
      if (result.error) return result.error;

      const { entity, table, columns, rows, count } = result;
      const headers = columns || Object.keys(rows[0]);
      const tableRows = rows.map((r: any) =>
        headers.map((h: string) => {
          const v = r[h];
          return v === null ? 'NULL' : String(v);
        })
      );

      let md = `## ${entity}\n\n**Table:** \`${table}\`\n**Columns:** ${headers.join(', ')}\n**Showing:** ${count} rows\n\n`;
      md += formatMarkdownTable(headers, tableRows);
      return md;
    } catch {
      return `Raw output:\n${output.slice(0, 5000)}`;
    }
  },
};

const capDbSchema: ToolDefinition = {
  name: 'cap_db_schema',
  description:
    'List all database tables with their column definitions (name, type, key status). ' +
    'Essential reference for building SQL queries — shows exact table and column names to use in cap_cql_query.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, cwd) => {
    const output = await executeShell(
      `node "${queryRunnerPath()}" --schema`,
      cwd,
      15000
    );

    try {
      const result = JSON.parse(output.trim());
      if (result.error) return `Error: ${result.error}`;

      const { tables, totalTables } = result;
      let md = `## Database Schema\n\n**Total tables:** ${totalTables}\n\n`;

      for (const t of tables) {
        md += `### ${t.entity}${t.isView ? ' (view)' : ''}\n`;
        md += `**Table:** \`${t.table}\`\n\n`;

        const headers = ['Column', 'Type', 'Key'];
        const rows = t.columns.map((c: any) => [
          c.name,
          c.length ? `${c.type}(${c.length})` : c.type,
          c.key ? 'KEY' : '',
        ]);
        md += formatMarkdownTable(headers, rows) + '\n';
      }

      return md;
    } catch {
      return `Raw output:\n${output.slice(0, 5000)}`;
    }
  },
};

// ─── Export all tools ────────────────────────────────────────

export const ALL_TOOLS: ToolDefinition[] = [
  // Model introspection
  capEntities,
  capEntityDetail,
  capAssociations,
  capServices,
  // Schema & compilation
  capCompile,
  capEdm,
  // Data inspection
  capCsvInspect,
  // Project management
  capProjectInfo,
  capMtaInfo,
  capBuild,
  // HANA bridge
  capToHanaMapping,
  // Data query (SQL against in-memory SQLite)
  capCqlQuery,
  capDataStats,
  capSampleData,
  capDbSchema,
  // OData live query (requires running server)
  capQuery,
];
