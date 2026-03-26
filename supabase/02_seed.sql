-- ============================================================
-- BetaWise Seed Data — run AFTER schema.sql
-- Realistic matches for demo/testing
-- ============================================================

-- ─── Competitions ───────────────────────────────────────────
-- Already seeded in schema.sql, just grab IDs:
-- SELECT id, name FROM competitions;

DO $$
DECLARE
  v_football_id   UUID;
  v_rugby_id      UUID;
  v_athletics_id  UUID;
  v_epl_id        UUID;
  v_kpl_id        UUID;
  v_rugby_comp_id UUID;
  v_athletics_comp_id UUID;

  v_match_id  UUID;
  v_market_id UUID;
BEGIN

  SELECT id INTO v_football_id   FROM sports WHERE slug = 'football';
  SELECT id INTO v_rugby_id      FROM sports WHERE slug = 'rugby';
  SELECT id INTO v_athletics_id  FROM sports WHERE slug = 'athletics';

  SELECT id INTO v_epl_id        FROM competitions WHERE name = 'English Premier League';
  SELECT id INTO v_kpl_id        FROM competitions WHERE name = 'Kenya Premier League';
  SELECT id INTO v_rugby_comp_id FROM competitions WHERE name = 'World Rugby Championship';
  SELECT id INTO v_athletics_comp_id FROM competitions WHERE name = 'World Athletics Championship';

  -- ── FOOTBALL: EPL ──────────────────────────────────────────

  -- Match 1: Arsenal vs Chelsea
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status)
  VALUES (uuid_generate_v4(), v_football_id, v_epl_id, 'Arsenal', 'Chelsea',
          NOW() + INTERVAL '2 days', 'upcoming')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, '1X2', 'match_winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'home', 'Arsenal', 2.10),
    (v_market_id, v_match_id, 'draw', 'Draw',    3.40),
    (v_market_id, v_match_id, 'away', 'Chelsea', 3.25);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Over / Under 2.5', 'over_under_2.5') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'over',  'Over 2.5',  1.85),
    (v_market_id, v_match_id, 'under', 'Under 2.5', 1.95);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Both Teams to Score', 'btts') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'yes', 'Yes', 1.72),
    (v_market_id, v_match_id, 'no',  'No',  2.05);

  -- Match 2: Man City vs Liverpool
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status)
  VALUES (uuid_generate_v4(), v_football_id, v_epl_id, 'Manchester City', 'Liverpool',
          NOW() + INTERVAL '2 days 3 hours', 'upcoming')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, '1X2', 'match_winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'home', 'Man City',  1.95),
    (v_market_id, v_match_id, 'draw', 'Draw',       3.60),
    (v_market_id, v_match_id, 'away', 'Liverpool',  3.80);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Over / Under 2.5', 'over_under_2.5') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'over',  'Over 2.5',  1.72),
    (v_market_id, v_match_id, 'under', 'Under 2.5', 2.08);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Both Teams to Score', 'btts') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'yes', 'Yes', 1.65),
    (v_market_id, v_match_id, 'no',  'No',  2.15);

  -- Match 3: Real Madrid vs Barcelona
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status)
  VALUES (uuid_generate_v4(), v_football_id, v_epl_id, 'Real Madrid', 'Barcelona',
          NOW() + INTERVAL '4 days', 'upcoming')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, '1X2', 'match_winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'home', 'Real Madrid', 2.35),
    (v_market_id, v_match_id, 'draw', 'Draw',         3.20),
    (v_market_id, v_match_id, 'away', 'Barcelona',    2.90);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Over / Under 2.5', 'over_under_2.5') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'over',  'Over 2.5',  1.78),
    (v_market_id, v_match_id, 'under', 'Under 2.5', 2.00);

  -- ── FOOTBALL: Kenya Premier League ─────────────────────────

  -- Match 4: Gor Mahia vs AFC Leopards
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status)
  VALUES (uuid_generate_v4(), v_football_id, v_kpl_id, 'Gor Mahia', 'AFC Leopards',
          NOW() + INTERVAL '1 day', 'upcoming')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, '1X2', 'match_winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'home', 'Gor Mahia',    2.05),
    (v_market_id, v_match_id, 'draw', 'Draw',           3.10),
    (v_market_id, v_match_id, 'away', 'AFC Leopards',  3.50);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Over / Under 2.5', 'over_under_2.5') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'over',  'Over 2.5',  2.10),
    (v_market_id, v_match_id, 'under', 'Under 2.5', 1.70);

  -- Match 5: Tusker FC vs Kakamega Homeboyz
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status)
  VALUES (uuid_generate_v4(), v_football_id, v_kpl_id, 'Tusker FC', 'Kakamega Homeboyz',
          NOW() + INTERVAL '3 days', 'upcoming')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, '1X2', 'match_winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'home', 'Tusker FC',          2.30),
    (v_market_id, v_match_id, 'draw', 'Draw',                3.00),
    (v_market_id, v_match_id, 'away', 'Kakamega Homeboyz', 2.80);

  -- ── RUGBY ──────────────────────────────────────────────────

  -- Match 6: South Africa vs New Zealand
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status)
  VALUES (uuid_generate_v4(), v_rugby_id, v_rugby_comp_id, 'South Africa', 'New Zealand',
          NOW() + INTERVAL '5 days', 'upcoming')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Match Winner', 'match_winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'home', 'South Africa', 2.20),
    (v_market_id, v_match_id, 'draw', 'Draw',          15.00),
    (v_market_id, v_match_id, 'away', 'New Zealand',   1.70);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Over / Under 49.5 Points', 'over_under_49.5') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'over',  'Over 49.5',  1.90),
    (v_market_id, v_match_id, 'under', 'Under 49.5', 1.88);

  -- Match 7: Kenya vs Uganda (Elgon Cup)
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status, description)
  VALUES (uuid_generate_v4(), v_rugby_id, v_rugby_comp_id, 'Kenya Simbas', 'Uganda',
          NOW() + INTERVAL '6 days', 'upcoming', 'Elgon Cup 2025')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Match Winner', 'match_winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'home', 'Kenya Simbas', 1.80),
    (v_market_id, v_match_id, 'draw', 'Draw',          12.00),
    (v_market_id, v_match_id, 'away', 'Uganda',        2.10);

  -- ── ATHLETICS ──────────────────────────────────────────────

  -- Match 8: 100m Final
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status, description)
  VALUES (uuid_generate_v4(), v_athletics_id, v_athletics_comp_id, 'Marcell Jacobs', NULL,
          NOW() + INTERVAL '3 days', 'upcoming', '100m Men Final — Will he run under 9.80s?')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Finish Under 9.80s', 'time_trial_9.80') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'yes', 'Under 9.80s', 2.40),
    (v_market_id, v_match_id, 'no',  'Over 9.80s',  1.55);

  -- Match 9: Marathon — Eliud Kipchoge podium
  INSERT INTO matches (id, sport_id, competition_id, home_team, away_team, scheduled_at, status, description)
  VALUES (uuid_generate_v4(), v_athletics_id, v_athletics_comp_id, 'Eliud Kipchoge', NULL,
          NOW() + INTERVAL '7 days', 'upcoming', 'Tokyo Marathon 2025 — Kipchoge Top 3 Finish?')
  RETURNING id INTO v_match_id;

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Top 3 Finish', 'top_3_finish') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'yes', 'Top 3', 1.45),
    (v_market_id, v_match_id, 'no',  'Outside Top 3', 2.70);

  INSERT INTO markets (id, match_id, name, market_key) VALUES (uuid_generate_v4(), v_match_id, 'Will Win', 'winner') RETURNING id INTO v_market_id;
  INSERT INTO odds (market_id, match_id, selection, label, decimal_odds) VALUES
    (v_market_id, v_match_id, 'yes', 'Kipchoge Wins', 1.90),
    (v_market_id, v_match_id, 'no',  'Another Winner', 1.88);

END $$;

-- Verify
SELECT
  m.home_team || COALESCE(' vs ' || m.away_team, '') AS match_name,
  s.name AS sport,
  m.scheduled_at::date AS date,
  COUNT(DISTINCT mk.id) AS markets,
  COUNT(o.id) AS total_odds
FROM matches m
JOIN sports s ON s.id = m.sport_id
JOIN markets mk ON mk.match_id = m.id
JOIN odds o ON o.match_id = m.id
GROUP BY m.id, m.home_team, m.away_team, s.name, m.scheduled_at
ORDER BY m.scheduled_at;
