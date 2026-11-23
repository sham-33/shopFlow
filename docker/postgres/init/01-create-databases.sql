-- One Postgres server, one database per service (see docs/plan.md, section 2).
-- Runs only on the first start, when the data volume is empty.
CREATE DATABASE orders_db;
CREATE DATABASE inventory_db;
CREATE DATABASE payment_db;
