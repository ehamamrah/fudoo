import { useState } from "react";

const newAttemptId = () => crypto.randomUUID();

export function useAttemptId() {
  const [id, setId] = useState(newAttemptId);
  const renew = () => setId(newAttemptId());
  return { id, renew };
}
