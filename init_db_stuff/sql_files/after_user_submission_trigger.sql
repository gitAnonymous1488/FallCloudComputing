CREATE TRIGGER after_user_submission_trigger
AFTER INSERT
ON user_submision_table
FOR EACH ROW
EXECUTE PROCEDURE after_user_submission();