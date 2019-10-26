CREATE OR REPLACE FUNCTION after_node_delete()
RETURNS TRIGGER 
LANGUAGE 'plpgsql'
AS $BODY$

BEGIN
	PERFORM pg_notify( 'delete_node_event', OLD.node_registration_id || '|' || OLD.node_ip || '|' || round( date_part( 'epoch', now() ) ) );

	RETURN OLD;
END;

$BODY$;