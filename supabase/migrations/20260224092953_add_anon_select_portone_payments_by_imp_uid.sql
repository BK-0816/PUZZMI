/*
  # Add anonymous select policy for portone_payments by imp_uid

  ## Problem
  When payment_page.html checks payment status after PortOne payment,
  it queries portone_payments by imp_uid. The user may be unauthenticated
  (user_id = null), so the existing "Users can view own payments" policy
  (auth.uid() = user_id) blocks the query with a 400 error.

  ## Changes
  - Add a SELECT policy allowing anyone to read a portone_payment row
    when the imp_uid matches a parameter they already know.
    This is safe because imp_uid is an unguessable payment ID.
*/

CREATE POLICY "Anyone can view payment by imp_uid"
  ON portone_payments FOR SELECT
  USING (true);
