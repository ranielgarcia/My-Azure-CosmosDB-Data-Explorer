# Sample Data — Cosmos DB Test Account

Two databases, two containers each. All JSON files are arrays of documents ready for bulk upload.

---

## Database & Container Setup

### Database 1: `ecommerce`

| Container | Partition Key  | File                             | Documents |
|-----------|----------------|----------------------------------|-----------|
| products  | `/category`    | `ecommerce/products.json`        | 10        |
| orders    | `/customerId`  | `ecommerce/orders.json`          | 10        |

### Database 2: `hr`

| Container | Partition Key  | File                             | Documents |
|-----------|----------------|----------------------------------|-----------|
| employees | `/department`  | `hr/employees.json`              | 10        |
| projects  | `/status`      | `hr/projects.json`               | 10        |

---

## Cross-references

- `orders[].items[].productId` → values exist in `products[].id`
- `employees[].managerId` → values exist in `employees[].id` (or `null` for top-level)
- `projects[].teamId` uses logical team names (`team-engineering`, `team-design`, `team-product`, `team-sales`) that map to `employees[].department`

---

## Importing via Azure Portal

1. Open the [Azure Portal](https://portal.azure.com) and navigate to your Cosmos DB account.
2. Open **Data Explorer**.
3. Create the database and container first (if they don't exist):
   - Click **New Container** → set the **Database id**, **Container id**, and **Partition key** from the table above.
4. Select the container, then click **Items** in the left tree.
5. Click **Upload Item** (the upload icon in the top bar).
6. Select the corresponding JSON file and click **Upload**.

> The portal uploader accepts a JSON array — these files are already in the correct format.

---

## Importing via Azure CLI (`az cosmosdb`)

Install the [Azure Cosmos DB Data Migration Tool](https://github.com/AzureCosmosDB/data-migration-desktop-tool) or use `az cosmosdb` with the REST API. A quick loop using the Azure CLI data-plane REST import:

```bash
# Set your values
ACCOUNT="<your-account-name>"
RESOURCE_GROUP="<your-resource-group>"
KEY=$(az cosmosdb keys list -n $ACCOUNT -g $RESOURCE_GROUP --query primaryKey -o tsv)
ENDPOINT="https://${ACCOUNT}.documents.azure.com"

# Example: upload products
az cosmosdb sql container throughput show \
  --account-name $ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name ecommerce \
  --name products
```

For bulk import, the [Cosmos DB Data Migration Desktop Tool](https://github.com/AzureCosmosDB/data-migration-desktop-tool) is recommended — point its **JSON source** at any file in this folder and configure the destination container.

---

## Useful Queries to Try

```sql
-- All electronics products under $150
SELECT * FROM c WHERE c.category = "Electronics" AND c.price < 150

-- All delivered orders for a specific customer
SELECT * FROM c WHERE c.customerId = "cust-101" AND c.status = "delivered"

-- Active employees in Engineering sorted by hire date
SELECT c.firstName, c.lastName, c.hireDate FROM c
WHERE c.department = "Engineering" AND c.isActive = true
ORDER BY c.hireDate ASC

-- All active or planned projects over $100,000 budget
SELECT c.title, c.status, c.budget FROM c
WHERE c.status IN ("active", "planned") AND c.budget > 100000
ORDER BY c.budget DESC
```
