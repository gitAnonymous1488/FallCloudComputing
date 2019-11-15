CREATE OR REPLACE FUNCTION after_image_processing_insert()
  RETURNS TRIGGER 
  LANGUAGE 'plpgsql'
  AS $BODY$

BEGIN
	PERFORM pg_notify( 'image_job', '{"table": "image_processing_result", "processing_id":' || NEW.processing_id || ',"job_id":"' || NEW.job_id || '","processed_photo_path":"' || NEW.processed_photo_path || '","original_photo_path":"' || NEW.original_photo_path || '","submission_time":' || NEW.submission_time || '}');

	RETURN NEW;
END;

$BODY$;