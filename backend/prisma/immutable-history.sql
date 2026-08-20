-- Enforces immutability of OrderStatusHistory below the application layer.
-- The app only ever INSERTs into this table; this trigger makes UPDATE/DELETE
-- fail even if application code has a bug or a future contributor forgets.
-- Run once after the baseline migration: `npm run db:harden`.

CREATE OR REPLACE FUNCTION prevent_order_status_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'OrderStatusHistory is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_status_history_immutable ON "OrderStatusHistory";

CREATE TRIGGER trg_order_status_history_immutable
BEFORE UPDATE OR DELETE ON "OrderStatusHistory"
FOR EACH ROW EXECUTE FUNCTION prevent_order_status_history_mutation();
