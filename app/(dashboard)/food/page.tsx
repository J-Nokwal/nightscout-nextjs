import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FoodEditor } from "./FoodEditor";

export default async function FoodPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Food Editor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Built-in food database + your custom entries. Custom foods are stored locally in your browser.
        </p>
      </div>
      <FoodEditor />
    </div>
  );
}
