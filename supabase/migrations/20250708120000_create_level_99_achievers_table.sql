CREATE TABLE level_99_achievers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username TEXT NOT NULL,
    hotel TEXT NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rank INT NOT NULL,
    UNIQUE(username, hotel)
);
