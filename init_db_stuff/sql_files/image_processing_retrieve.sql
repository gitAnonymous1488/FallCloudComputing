-- TODO: MAKE THIS A STORED PROCEDURE
-- TODO: THIS SHOULD NOTIFY NEW USER SUBMISSION
CREATE OR REPLACE FUNCTION image_processing_retrieve(
	
) RETURNS TABLE(processing_id integer, job_id text, processed_photo_path text, original_photo_path text, submission_time integer) AS $$
BEGIN

	RETURN QUERY 
	DELETE FROM image_processing_result ipr
	WHERE ipr.processing_id in (SELECT MIN(sipr.processing_id) FROM image_processing_result sipr)
	RETURNING *;

END;
$$
LANGUAGE plpgsql;