using flights from '../db/schema';

service FlightsService @(path: '/odata/v4/flights') {

    // ─── Airlines & Fleet ────────────────────────────────
    entity Carriers         as projection on flights.Carriers;
    entity CarrierPlanes    as projection on flights.CarrierPlanes;
    entity Planes           as projection on flights.Planes;
    entity CargoPlanes      as projection on flights.CargoPlanes;
    entity PassengerPlanes  as projection on flights.PassengerPlanes;

    // ─── Connections & Flights ───────────────────────────
    entity Connections      as projection on flights.Connections;
    entity Flights          as projection on flights.Flights;

    // ─── Bookings ────────────────────────────────────────
    entity Bookings         as projection on flights.Bookings;
    entity Tickets          as projection on flights.Tickets;
    entity Invoices         as projection on flights.Invoices;

    // ─── Customers & Business Partners ──────────────────
    entity Customers        as projection on flights.Customers;
    entity BusinessPartners as projection on flights.BusinessPartners;

    // ─── Travel Agencies ─────────────────────────────────
    entity TravelAgencies   as projection on flights.TravelAgencies;
    entity Counters         as projection on flights.Counters;

    // ─── Airports & Geography ───────────────────────────
    entity Airports         as projection on flights.Airports;
    entity CityAirports     as projection on flights.CityAirports;
    entity GeoCities        as projection on flights.GeoCities;

    // ─── In-flight Meals ─────────────────────────────────
    entity Meals            as projection on flights.Meals;
    entity MealTexts        as projection on flights.MealTexts;
    entity Menus            as projection on flights.Menus;
    entity FlightMeals      as projection on flights.FlightMeals;
    entity Starters         as projection on flights.Starters;
    entity MainCourses      as projection on flights.MainCourses;
    entity Desserts         as projection on flights.Desserts;

    // ─── Currency ────────────────────────────────────────
    entity CurrencyRates    as projection on flights.CurrencyRates;
    entity CurrencyDecimals as projection on flights.CurrencyDecimals;

    // ─── Views ───────────────────────────────────────────
    @readonly entity CustomerBusinessPartners as projection on flights.CustomerBusinessPartners;
    @readonly entity CarrierConnections       as projection on flights.CarrierConnections;

    // ─── Functions (replaces parameterized FligthsOnDate view) ────
    function getFlightsOnDate(flightDate : Date) returns array of CarrierConnections;
}
