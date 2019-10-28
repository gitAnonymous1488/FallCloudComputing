-- TODO: MAKE THIS A STORED PROCEDURE
CREATE OR REPLACE FUNCTION process_cron_job_cleanup(
	
) RETURNS INTEGER AS $$
DECLARE out_heartbeat_id INTEGER;
BEGIN

	DELETE FROM process_heartbeat_table
	WHERE has_been_pulled = true;

	DELETE FROM process_registration_table prt
	WHERE prt.process_registration_id NOT IN (
		SELECT DISTINCT pht.process_registration_id
		FROM process_heartbeat_table pht
		WHERE NOT pht.has_been_pulled
	);

	UPDATE process_heartbeat_table
	SET has_been_pulled = true;

	RETURN 1;
END;
$$
LANGUAGE plpgsql;

-- UPDATE node_heartbeat_table
-- SET has_been_pulled = true;