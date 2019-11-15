CREATE OR REPLACE FUNCTION after_user_submission()
  RETURNS TRIGGER 
  LANGUAGE 'plpgsql'
  AS $BODY$

BEGIN
	
	PERFORM pg_notify( 'submission_job', '{"table": "user_submission_table", "submission_id":' || NEW.submission_id || ',"job_id":"' || NEW.job_id || '","photo_path":"' || NEW.photo_path || '","submission_time":' || NEW.submission_time || '}');

	RETURN NEW;
END;

$BODY$;