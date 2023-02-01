import { z } from "zod";
import { Id, TableNames } from "../_generated/dataModel";

/**
 * Zod helper for a Convex Id, used for validation.
 *
 * @param tableName - The table that the Id references. i.e. Id<tableName>
 * @returns - A Zod object representing a Convex Id
 */

export const zId = <TableName extends TableNames>(tableName: TableName) =>
  z.custom<Id<TableName>>(
    (val) => val instanceof Id && val.tableName === tableName
  );
/**
 * Zod helper for adding Convex system fields to a record to return.
 *
 * @param tableName - The table where records are from, i.e. Document<tableName>
 * @param zObject - The other fields you want to extract from the table.
 * @returns - zod shape for use with z.object(shape) that includes system fields
 */

export const addSystemFields = <T>(tableName: TableNames, zObject: T) => {
  return { ...zObject, _id: zId(tableName), _creationTime: z.number() };
};
