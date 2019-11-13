-- TODO: MAKE THIS A STORED PROCEDURE
-- TODO: THIS SHOULD NOTIFY NEW USER SUBMISSION
CREATE OR REPLACE FUNCTION user_submission_retrieve(
	IN in_job_id TEXT
) RETURNS TABLE(submission_id INTEGER,job_id TEXT,photo_path TEXT,submission_time INTEGER) AS $$
DECLARE
	ref refcursor;                                                     -- Declare a cursor variable
BEGIN

	RETURN QUERY 
	DELETE FROM user_submision_table ust
	WHERE ust.job_id = in_job_id
	RETURNING *;

END;
$$
LANGUAGE plpgsql;