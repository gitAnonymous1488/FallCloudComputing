CREATE OR REPLACE FUNCTION after_node_register()
  RETURNS TRIGGER 
  LANGUAGE 'plpgsql'
  AS $BODY$

BEGIN
	PERFORM pg_notify( 'new_node_event', NEW.node_registration_id || '|' || NEW.node_ip || '|' || NEW.registration_time );

	RETURN NEW;
END;

$BODY$;