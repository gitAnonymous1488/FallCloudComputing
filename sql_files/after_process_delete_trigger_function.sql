CREATE OR REPLACE FUNCTION after_process_delete()
RETURNS TRIGGER 
LANGUAGE 'plpgsql'
AS $BODY$

BEGIN
	PERFORM pg_notify( 'delete_process_event', OLD.process_registration_id || '|' || OLD.process_pid || '|' || OLD.process_host_ip || '|' || OLD.process_name  || '|' || round( date_part( 'epoch', now() ) ) );

	RETURN OLD;
END;

$BODY$;