-- Add aircraft_registration to vidmaflights
ALTER TABLE public.vidmaflights
ADD COLUMN IF NOT EXISTS aircraft_registration text NULL;

-- Optional: simple index to speed up queries by registration
CREATE INDEX IF NOT EXISTS vidmaflights_aircraft_registration_idx
  ON public.vidmaflights (aircraft_registration);
