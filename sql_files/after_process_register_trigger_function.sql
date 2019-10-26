CREATE OR REPLACE FUNCTION after_process_register()
  RETURNS TRIGGER 
  LANGUAGE 'plpgsql'
  AS $BODY$

BEGIN
	PERFORM pg_notify( 'new_process_event', NEW.process_registration_id || '|' || NEW.process_pid || '|' || NEW.process_host_ip || '|' || NEW.process_name || '|' || NEW.registration_time );

	RETURN NEW;
END;

$BODY$;