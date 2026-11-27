import { requireAdmin } from "@/lib/security/auth";
import { CategoryManager, type Category } from "./category-manager";

export default async function Categories() {
  const { client } = await requireAdmin();
  const categories: Category[] = [];
  const batchSize = 500;

  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await client.from("categories")
      .select("id,name,slug,description,is_active,sort_order")
      .order("sort_order").order("name").order("id")
      .range(offset, offset + batchSize - 1);

    if (error) throw new Error("CATEGORIES_UNAVAILABLE");
    categories.push(...data);
    if (data.length < batchSize) break;
  }

  return <CategoryManager categories={categories} />;
}
