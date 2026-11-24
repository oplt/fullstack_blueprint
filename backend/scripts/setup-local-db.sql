-- Run as a local PostgreSQL administrator on a server with pgvector.
-- The credential below is a development placeholder for a newly created role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fullstack_blueprint') THEN
    CREATE ROLE fullstack_blueprint LOGIN PASSWORD 'fullstack_blueprint';
  END IF;
END
$$;

SELECT 'CREATE DATABASE fullstack_blueprint OWNER fullstack_blueprint'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fullstack_blueprint')\gexec

\connect fullstack_blueprint
CREATE EXTENSION IF NOT EXISTS vector;
