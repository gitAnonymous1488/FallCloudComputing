-- TODO: MAKE THIS A STORED PROCEDURE
-- TODO: THIS SHOULD NOTIFY NEW USER SUBMISSION
CREATE OR REPLACE FUNCTION facial_detection_retrieve(
	
) RETURNS TABLE(facial_detection_id integer, job_id text, processed_photo_path text, original_photo_path text, bounding_box_x integer, bounding_box_y integer, bounding_box_width integer, bounding_box_height integer, submission_time integer) AS $$
BEGIN

	RETURN QUERY 
	DELETE FROM facial_detection_result fdr
	WHERE fdr.facial_detection_id in (SELECT MIN(sfdr.facial_detection_id) FROM facial_detection_result sfdr)
	RETURNING *;

END;
$$
LANGUAGE plpgsql;