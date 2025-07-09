CREATE TABLE last_searched_players (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username TEXT NOT NULL,
    hotel TEXT NOT NULL,
    searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(username, hotel)
);

-- Optional: Create a function to keep only the latest N entries
CREATE OR REPLACE FUNCTION delete_old_searched_players()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM last_searched_players
    WHERE id NOT IN (
        SELECT id
        FROM last_searched_players
        ORDER BY searched_at DESC
        LIMIT 10 -- Keep only the last 10 entries
    );
    RETURN NULL;
END;
$$
LANGUAGE plpgsql;

-- Optional: Create a trigger to call the function after each insert/update
CREATE TRIGGER delete_old_searched_players_trigger
AFTER INSERT OR UPDATE ON last_searched_players
FOR EACH STATEMENT EXECUTE FUNCTION delete_old_searched_players();
