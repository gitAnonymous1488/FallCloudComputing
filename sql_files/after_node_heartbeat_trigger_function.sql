CREATE OR REPLACE FUNCTION after_node_heartbeat()
  RETURNS TRIGGER 
  LANGUAGE 'plpgsql'
  AS $BODY$

BEGIN
	PERFORM pg_notify( 'new_node_heartbeat_event', NEW.node_registration_id || '|' || NEW.node_heartbeat_time );

	RETURN NEW;
END;

$BODY$;