-- TODO: MAKE THIS A STORED PROCEDURE
CREATE OR REPLACE FUNCTION insert_node_registration(
	IN in_ip TEXT
) RETURNS INTEGER AS $$
DECLARE out_registration_id INTEGER;
BEGIN

	INSERT INTO node_registration_table (node_ip)
	VALUES (in_ip)
	RETURNING node_registration_id INTO out_registration_id;

	INSERT INTO node_heartbeat_table (node_registration_id)
	VALUES (out_registration_id);

	RETURN out_registration_id;
END;
$$
LANGUAGE plpgsql;