import { z } from 'zod';

/**
 * Product Create karne ke liye validation schema
 */
export const createProductSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Product name is required",
    }).min(3, "Name must be at least 3 characters long"),
    
    description: z.string({
      required_error: "Description is required",
    }).min(10, "Description should be at least 10 characters"),
    
    // Price string mein aa sakta hai form-data se, isliye hum use number mein convert karenge
    price: z.preprocess((val) => Number(val), z.number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    }).positive("Price must be a positive value")),
    
    stock: z.preprocess((val) => Number(val), z.number({
      invalid_type_error: "Stock must be a number",
    }).int().nonnegative().default(0)),
    
    category: z.string({
      required_error: "Category is required",
    }).min(2, "Category name is too short"),
    
    gender: z.enum(['men', 'women', 'unisex'], {
      required_error: "Gender category is required",
    }).default('unisex'),
    
    // image_url optional hai kyunki hum Multer se file bhi bhej sakte hain
    image_url: z.string().url("Invalid image URL").optional().or(z.literal('')),
  }),
});

/**
 * Product Update karne ke liye validation schema (Saare fields optional hote hain)
 */
export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    price: z.preprocess((val) => Number(val), z.number().positive().optional()),
    stock: z.preprocess((val) => Number(val), z.number().int().nonnegative().optional()),
    category: z.string().min(2).optional(),
    gender: z.enum(['men', 'women', 'unisex']).optional(),
    image_url: z.string().url().optional(),
    // FormData se boolean string format mein aata hai ("true"/"false"), isliye preprocess karke convert karte hain
    is_active: z.preprocess(
      (val) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          return val.toLowerCase() === 'true' || val === '1';
        }
        return Boolean(val);
      },
      z.boolean().optional()
    ),
    // Additional fields for product update
    wholesalePrice: z.preprocess((val) => val ? Number(val) : undefined, z.number().positive().optional()),
    moq: z.preprocess((val) => val ? Number(val) : undefined, z.number().int().positive().optional()),
  }),
});