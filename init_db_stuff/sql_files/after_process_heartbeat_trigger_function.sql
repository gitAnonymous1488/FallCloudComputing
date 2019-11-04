CREATE OR REPLACE FUNCTION after_process_heartbeat()
  RETURNS TRIGGER 
  LANGUAGE 'plpgsql'
  AS $BODY$

BEGIN
	PERFORM pg_notify( 'new_process_heartbeat_event', NEW.process_registration_id || '|' || NEW.process_heartbeat_time );

	RETURN NEW;
END;

$BODY$;