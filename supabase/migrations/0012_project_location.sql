-- Add geo coordinates to projects so the address text can be paired with a
-- pinned location on a map. Both columns are nullable: existing rows have no
-- pin, and the user can leave the pin blank when creating a new project.
--
-- We don't use a PostGIS geography column because we never query by distance —
-- the coordinates are just rendered on the project detail page. Two doubles
-- keep the schema portable and avoid pulling in PostGIS for one feature.

alter table projects
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

-- Sanity bounds. A coordinate outside these ranges is always a bug
-- (probably a swap of lat/lng or a parse error from the geocoder).
alter table projects
  add constraint projects_latitude_range
    check (latitude  is null or (latitude  between -90  and 90)),
  add constraint projects_longitude_range
    check (longitude is null or (longitude between -180 and 180));
