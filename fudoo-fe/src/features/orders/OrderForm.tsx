import type { Order } from "../../api/types";
import { Button } from "../../components/Button";
import { FormPanel } from "../../components/FormPanel";
import { useAttemptId } from "../../lib/useAttemptId";
import { CartEditor, type CartOptions } from "./CartEditor";
import { useCreateOrder } from "./hooks";
import { OrderLines, OrderStatusBadge } from "./OrderOutcome";
import { toOrderInput, useCart } from "./useCart";

function useOrderForm() {
  const cart = useCart();
  const attempt = useAttemptId();
  const create = useCreateOrder();
  const onSuccess = () => { cart.reset(); attempt.renew(); };
  const submit = () => create.mutate(toOrderInput(attempt.id, cart.lines), { onSuccess });
  return { cart, externalId: attempt.id, create, submit };
}

function OrderResult({ order }: { order: Order }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-inset ring-slate-200">
      <p className="flex items-center gap-2 font-medium">Order #{order.id} recorded <OrderStatusBadge status={order.status} /></p>
      <OrderLines lines={order.lines} />
    </div>
  );
}

export function OrderForm({ options }: { options: CartOptions }) {
  const { cart, externalId, create, submit } = useOrderForm();
  return (
    <FormPanel title="New order" error={create.error} onSubmit={submit}>
      <CartEditor cart={cart} options={options} />
      <p className="text-xs text-slate-500">External id: <code>{externalId}</code></p>
      <Button type="submit" className="self-start" disabled={create.isPending}>Place order</Button>
      {create.data && <OrderResult order={create.data} />}
    </FormPanel>
  );
}
