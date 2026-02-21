# SAP Flight Model — BTP CAP CDS

The classic SAP Flight Model (SFLIGHT, SPFLI, etc.) transformed from a HANA XSA HDI-only project into a fully deployable **BTP CAP CDS** application with OData V4 service, XSUAA security, and approuter.

## Quick Start

```bash
npm install
cds watch
```

Open [http://localhost:4004](http://localhost:4004) to browse the service.

## Project Structure

```
sflights-xsa/
  db/
    schema.cds          # 26 entities + 2 views (CAP CDS)
    data/               # 24 CSV seed data files
    package.json        # HDI deployer
  srv/
    flights-service.cds # OData V4 service definition
    flights-service.js  # Service handler (getFlightsOnDate)
  app/router/           # Approuter for BTP deployment
  mta.yaml              # MTA deployment descriptor (schema 3.3)
  xs-security.json      # XSUAA role/scope config
```

## Entities (26)

| Category | Entities |
|----------|----------|
| Airlines & Fleet | Carriers, CarrierPlanes, Planes, CargoPlanes, PassengerPlanes |
| Connections & Flights | Connections, Flights |
| Bookings | Bookings, Tickets, Invoices |
| Customers | Customers, BusinessPartners |
| Travel | TravelAgencies, Counters |
| Airports & Geo | Airports, CityAirports, GeoCities |
| Meals | Meals, MealTexts, Menus, FlightMeals, Starters, MainCourses, Desserts |
| Currency | CurrencyRates, CurrencyDecimals |

## Views

- **CustomerBusinessPartners** — Customers joined with their business partner details
- **CarrierConnections** — Carriers with their connections and flight schedules

## API Endpoints

- `GET /odata/v4/flights/$metadata` — OData metadata
- `GET /odata/v4/flights/Carriers` — All airlines
- `GET /odata/v4/flights/Flights?$top=5` — Flight records
- `GET /odata/v4/flights/getFlightsOnDate(flightDate=2010-09-06)` — Flights for a specific date

## Deployment

```bash
npm run build       # or: npx cds build --production
# then deploy the generated MTA archive to BTP Cloud Foundry
```

## Origin

Transformed from [sflights-xsa](https://github.com/AKS91/sflights-xsa) — originally a HANA XSA HDI-only project with `.hdbcds` tables and `.hdbtabledata` imports.
