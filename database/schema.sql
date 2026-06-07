-- Conference Radar PostgreSQL schema
-- Run with: psql -U postgres -h localhost -d conference_radar -f database/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id serial NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS scrape_configs (
    id serial NOT NULL,
    conf_url text NOT NULL,
    absdeadline_xpath text,
    papdeadline_xpath text,
    confdate_xpath text,
    confvenue_xpath text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    conf_ext_id text NOT NULL,
    abstime_xpath text,
    papertime_xpath text,
    CONSTRAINT scrape_configs_pkey PRIMARY KEY (id),
    CONSTRAINT scrape_configs_conf_ext_id_key UNIQUE (conf_ext_id)
);

CREATE TABLE IF NOT EXISTS conferences (
    conf_id serial NOT NULL,
    config_id integer,
    abs_deadline date,
    abs_time time without time zone,
    paper_deadline date,
    paper_time time without time zone,
    confer_startdate date,
    confer_venue text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    short_title text,
    long_title text,
    research_domain text,
    keywords text[],
    abs_timezone text,
    paper_timezone text,
    user_id integer,
    confer_enddate date,
    CONSTRAINT conferences_pkey PRIMARY KEY (conf_id),
    CONSTRAINT cons_config_id_unique UNIQUE (config_id),
    CONSTRAINT conferences_config_id_fkey FOREIGN KEY (config_id) REFERENCES scrape_configs(id),
    CONSTRAINT conferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_saved_dashboards (
    id serial NOT NULL,
    user_id integer NOT NULL,
    saved_user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT user_saved_dashboards_pkey PRIMARY KEY (id),
    CONSTRAINT user_saved_dashboards_user_id_saved_user_id_key UNIQUE (user_id, saved_user_id),
    CONSTRAINT user_saved_dashboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_saved_dashboards_saved_user_id_fkey FOREIGN KEY (saved_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_saved_dashboards_user_id
    ON user_saved_dashboards USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_user_saved_dashboards_saved_user_id
    ON user_saved_dashboards USING btree (saved_user_id);
