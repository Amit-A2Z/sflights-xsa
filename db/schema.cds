namespace flights;

// ─── Airlines & Fleet ────────────────────────────────────────

entity Carriers {
    key MANDT       : String(3);
    key CARRID      : String(3);
        CARRNAME    : String(20);
        CURRCODE    : String(5);
        URL         : String(255);
        CONNECTIONS : Association to many Connections on CONNECTIONS.MANDT = MANDT and CONNECTIONS.CARRID = CARRID;
        FLIGHTS     : Association to many Flights     on FLIGHTS.MANDT = MANDT     and FLIGHTS.CARRID = CARRID;
}

entity CarrierPlanes {
    key MANDT     : String(3);
    key CARRID    : String(3);
    key PLANETYPE : String(10);
        SNUMBER   : Decimal(6, 0);
}

entity Planes {
    key MANDT      : String(3);
    key PLANETYPE  : String(10);
        SEATSMAX   : Integer not null;
        CONSUM     : Double;
        CON_UNIT   : String(3);
        TANKCAP    : Decimal(16, 4);
        CAP_UNIT   : String(3);
        WEIGHT     : Decimal(14, 4);
        WEI_UNIT   : String(3);
        SPAN       : Double;
        SPAN_UNIT  : String(3);
        LENG       : Double;
        LENG_UNIT  : String(3);
        OP_SPEED   : Decimal(17, 4);
        SPEED_UNIT : String(3);
        PRODUCER   : String(5);
        SEATSMAX_B : Integer;
        SEATSMAX_F : Integer;
}

entity CargoPlanes {
    key MANDT     : String(3);
    key PLANETYPE : String(10);
        CARGOMAX  : Decimal(16, 4);
        CAR_UNIT  : String(3) not null;
}

entity PassengerPlanes {
    key MANDT      : String(3);
    key PLANETYPE  : String(10);
        ANZ_NOTAUS : Integer;
        ANZ_PERS   : Integer;
        ANZ_SBER   : Integer;
}

// ─── Connections & Flights ───────────────────────────────────

entity Connections {
    key MANDT     : String(3);
    key CARRID    : String(3);
    key CONNID    : String(4);
        COUNTRYFR : String(3);
        CITYFROM  : String(20);
        AIRPFROM  : String(3);
        COUNTRYTO : String(3);
        CITYTO    : String(20);
        AIRPTO    : String(3);
        FLTIME    : Integer;
        DEPTIME   : Time;
        ARRTIME   : Time;
        DISTANCE  : Decimal(9, 4);
        DISTID    : String(3);
        FLTYPE    : String(1);
        PERIOD    : Integer;
}

entity Flights {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key CONNID     : String(4);
    key FLDATE     : Date;
        PRICE      : Decimal(15, 2);
        CURRENCY   : String(5);
        PLANETYPE  : String(10);
        SEATSMAX   : Integer;
        SEATSOCC   : Integer;
        PAYMENTSUM : Decimal(17, 2);
        SEATSMAX_B : Integer;
        SEATSOCC_B : Integer;
        SEATSMAX_F : Integer;
        SEATSOCC_F : Integer;
}

// ─── Bookings ────────────────────────────────────────────────

entity Bookings {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key CONNID     : String(4);
    key FLDATE     : Date;
    key BOOKID     : String(8);
        CUSTOMID   : String(8);
        CUSTTYPE   : String(1);
        SMOKER     : String(1);
        LUGGWEIGHT : Decimal(8, 4);
        WUNIT      : String(3);
        INVOICE    : String(1);
        CLASS      : String(1);
        FORCURAM   : Decimal(15, 2);
        FORCURKEY  : String(5);
        LOCCURAM   : Decimal(15, 2);
        LOCCURKEY  : String(5);
        ORDER_DATE : Date;
        COUNTER    : String(8);
        AGENCYNUM  : String(8);
        CANCELLED  : String(1);
        RESERVED   : String(1);
        PASSNAME   : String(25);
        PASSFORM   : String(15);
        PASSBIRTH  : String(8);
}

entity Tickets {
    key MANDT    : String(3);
    key CARRID   : String(3);
    key CONNID   : String(4);
    key FLDATE   : Date;
    key BOOKID   : String(8);
    key CUSTOMID : String(8);
    key TICKET   : String(1);
        PLACE    : String(40);
        ARCHIVE_ : String(4);
}

entity Invoices {
    key MANDT    : String(3);
    key CARRID   : String(3);
    key CONNID   : String(4);
    key FLDATE   : Date;
    key BOOKID   : String(8);
    key CUSTOMID : String(8);
    key INSTNO   : String(4);
        PAYMETH  : String(1);
        AMOUNT   : Decimal(15, 2);
        CURRENCY : String(5);
        ARCHIVE_ : String(4);
}

// ─── Customers & Business Partners ──────────────────────────

entity Customers {
    key MANDT           : String(3);
    key ID              : String(8);
        NAME            : String(25);
        FORM            : String(15);
        STREET          : String(30);
        POSTBOX         : String(10);
        POSTCODE        : String(10);
        CITY            : String(25);
        COUNTRY         : String(3);
        REGION          : String(3);
        TELEPHONE       : String(30);
        CUSTTYPE        : String(1);
        DISCOUNT        : String(3);
        LANGU           : String(1);
        EMAIL           : String(40);
        WEBUSER         : String(25);
        BUSINESSPARTNER : Association to BusinessPartners on BUSINESSPARTNER.MANDT = MANDT and BUSINESSPARTNER.BUSPARTNUM = ID;
}

entity BusinessPartners {
    key MANDT      : String(3);
    key BUSPARTNUM : String(8);
        CONTACT    : String(25);
        CONTPHONO  : String(30);
        BUSPATYP   : String(2);
}

// ─── Travel Agencies ─────────────────────────────────────────

entity TravelAgencies {
    key MANDT     : String(3);
    key AGENCYNUM : String(8);
        NAME      : String(25);
        STREET    : String(30);
        POSTBOX   : String(10);
        POSTCODE  : String(10);
        CITY      : String(25);
        COUNTRY   : String(3);
        REGION    : String(3);
        TELEPHONE : String(30);
        URL       : String(255);
        LANGU     : String(1);
        CURRENCY  : String(5);
}

entity Counters {
    key MANDT    : String(3);
    key CARRID   : String(3);
    key COUNTNUM : String(8);
        AIRPORT  : String(3);
}

// ─── Airports & Geography ───────────────────────────────────

entity Airports {
    key MANDT     : String(3);
    key ID        : String(3);
        NAME      : String(25);
        TIME_ZONE : String(6) not null;
}

entity CityAirports {
    key MANDT      : String(3);
    key CITY       : String(20);
    key COUNTRY    : String(3);
    key AIRPORT    : String(3);
        MASTERCITY : String(20);
}

entity GeoCities {
    key MANDT     : String(3);
    key CITY      : String(20);
    key COUNTRY   : String(3);
        LATITUDE  : Decimal(12, 6);
        LONGITUDE : Decimal(12, 6);
}

// ─── In-flight Meals ─────────────────────────────────────────

entity Meals {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key MEALNUMBER : String(8);
        MEALTYPE   : String(2);
}

entity MealTexts {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key MEALNUMBER : String(8);
    key LANG       : String(1);
        TEXT       : String(40);
}

entity Menus {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key MENUNUMBER : String(4);
        STARTER    : String(8);
        MAINCOURSE : String(8);
        DESSERT    : String(8);
}

entity FlightMeals {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key MEALNUMBER : String(8);
    key CONNID     : String(4);
}

entity Starters {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key MEALNUMBER : String(8);
        HOT        : String(1);
}

entity MainCourses {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key MEALNUMBER : String(8);
}

entity Desserts {
    key MANDT      : String(3);
    key CARRID     : String(3);
    key MEALNUMBER : String(8);
        HOT        : String(1);
}

// ─── Currency ────────────────────────────────────────────────

entity CurrencyRates {
    key MANDT : String(3);
    key KURST : String(4);
    key FCURR : String(5);
    key TCURR : String(5);
    key GDATU : Date;
        UKURS : Decimal(9, 5);
        FFACT : Decimal(9, 0);
        TFACT : Decimal(9, 0);
}

entity CurrencyDecimals {
    key CURRKEY : String(5);
        CURRDEC : Integer;
}

// ─── Views ───────────────────────────────────────────────────

entity CustomerBusinessPartners as
    select from Customers {
        key MANDT,
        key ID,
        BUSINESSPARTNER.BUSPARTNUM,
        NAME,
        BUSINESSPARTNER.CONTACT,
        BUSINESSPARTNER.CONTPHONO,
        BUSINESSPARTNER.BUSPATYP
    };

entity CarrierConnections as
    select from Carriers {
        key MANDT,
        key CARRID,
        CARRNAME,
        CURRCODE,
        key CONNECTIONS.CONNID,
        CONNECTIONS.COUNTRYFR,
        CONNECTIONS.CITYFROM,
        CONNECTIONS.AIRPFROM,
        CONNECTIONS.COUNTRYTO,
        CONNECTIONS.CITYTO,
        CONNECTIONS.AIRPTO,
        key FLIGHTS.FLDATE,
        FLIGHTS.PRICE,
        FLIGHTS.CURRENCY,
        FLIGHTS.PLANETYPE,
        FLIGHTS.SEATSMAX,
        FLIGHTS.SEATSOCC,
        FLIGHTS.PAYMENTSUM,
        FLIGHTS.SEATSMAX_B,
        FLIGHTS.SEATSOCC_B,
        FLIGHTS.SEATSMAX_F,
        FLIGHTS.SEATSOCC_F
    };
