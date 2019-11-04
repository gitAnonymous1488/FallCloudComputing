-- TODO: MAKE THIS A STORED PROCEDURE
CREATE OR REPLACE FUNCTION node_cron_job_cleanup(
	
) RETURNS INTEGER AS $$
DECLARE out_heartbeat_id INTEGER;
BEGIN

	DELETE FROM node_heartbeat_table
	WHERE has_been_pulled = true;

	DELETE FROM node_registration_table nrt
	WHERE nrt.node_registration_id NOT IN (
		SELECT DISTINCT nht.node_registration_id
		FROM node_heartbeat_table nht
		WHERE NOT nht.has_been_pulled
	);

	UPDATE node_heartbeat_table
	SET has_been_pulled = true;

	RETURN 1;
END;
$$
LANGUAGE plpgsql;

-- UPDATE node_heartbeat_table
-- SET has_been_pulled = true;