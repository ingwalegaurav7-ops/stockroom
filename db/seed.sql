USE stockroom_v2;

-- Insert demo user (password: "demo123" hashed with bcrypt)
-- bcrypt hash for "demo123" with cost 10
INSERT INTO users (email, password_hash, name, role) VALUES
('demo@stockroom.local', '$2a$10$LYX3HI73w1RF4xTrZjIz.uGr/X/u1bjPm9SQ5Csm9YT3kSecuT9Fu', 'Demo Staff', 'staff'),
('manager@stockroom.local', '$2a$10$LYX3HI73w1RF4xTrZjIz.uGr/X/u1bjPm9SQ5Csm9YT3kSecuT9Fu', 'Demo Manager', 'manager');

-- Insert categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Office Supplies', 'Stationery and office essentials'),
('Furniture', 'Office and home furniture'),
('Cleaning', 'Cleaning supplies and equipment'),
('Pantry', 'Food, beverages, and snacks');

-- Insert products with initial stock
INSERT INTO products (name, sku, category_id, unit_price, current_stock, reorder_level, description) VALUES
-- Electronics
('USB-C Hub 7-in-1', 'ELEC-USBHUB-001', 1, 2499.00, 15, 5, '7-port USB-C hub with HDMI, USB-A, SD card reader'),
('Wireless Mouse', 'ELEC-MOUSE-001', 1, 899.00, 25, 10, 'Ergonomic wireless mouse with USB receiver'),
('Mechanical Keyboard', 'ELEC-KEYB-001', 1, 4999.00, 8, 3, 'RGB mechanical keyboard with blue switches'),
('Monitor 24"', 'ELEC-MON-001', 1, 12999.00, 5, 2, '24-inch Full HD IPS monitor'),
('Laptop Stand', 'ELEC-LPSTAND-001', 1, 1499.00, 12, 4, 'Adjustable aluminum laptop stand'),
('Webcam 1080p', 'ELEC-WEBCAM-001', 1, 2999.00, 6, 3, 'Full HD webcam with microphone'),
('Headphones', 'ELEC-HEAD-001', 1, 3499.00, 10, 4, 'Over-ear wireless headphones with ANC'),

-- Office Supplies
('A4 Paper 500 sheets', 'OFF-PAPER-001', 2, 399.00, 50, 20, 'Standard A4 white printer paper'),
('Ballpoint Pens (12)', 'OFF-PENS-001', 2, 149.00, 100, 30, 'Blue ballpoint pens, pack of 12'),
('Sticky Notes', 'OFF-STICKY-001', 2, 99.00, 75, 25, 'Yellow sticky notes 3x3 inches, 100 sheets'),
('Stapler', 'OFF-STAPLER-001', 2, 249.00, 15, 5, 'Standard desktop stapler'),
('Tape Dispenser', 'OFF-TAPE-001', 2, 199.00, 20, 8, 'Desktop tape dispenser with 1 roll'),
('File Folders (25)', 'OFF-FOLDERS-001', 2, 299.00, 30, 10, 'Manila file folders, pack of 25'),
('Whiteboard Markers', 'OFF-WBMARK-001', 2, 349.00, 18, 6, 'Assorted colors, pack of 4'),

-- Furniture
('Ergonomic Chair', 'FURN-CHAIR-001', 3, 15999.00, 3, 1, 'Mesh ergonomic office chair with lumbar support'),
('Standing Desk', 'FURN-DESK-001', 3, 24999.00, 2, 1, 'Electric height-adjustable standing desk'),
('Bookshelf 5-tier', 'FURN-SHELF-001', 3, 4999.00, 6, 2, '5-tier wooden bookshelf'),
('Monitor Arm', 'FURN-MONARM-001', 3, 2499.00, 10, 3, 'Single monitor gas spring arm'),

-- Cleaning
('Multi-Surface Cleaner', 'CLEAN-MULTI-001', 4, 199.00, 25, 10, 'All-purpose cleaner spray 500ml'),
('Microfiber Cloths (12)', 'CLEAN-MICRO-001', 4, 299.00, 40, 15, 'Pack of 12 microfiber cleaning cloths'),
('Trash Bags (50)', 'CLEAN-TRASH-001', 4, 349.00, 35, 12, 'Heavy-duty trash bags 30L, pack of 50'),
('Hand Sanitizer 500ml', 'CLEAN-SANI-001', 4, 149.00, 30, 10, 'Alcohol-based hand sanitizer gel'),

-- Pantry
('Coffee Beans 1kg', 'PANTRY-COFFEE-001', 5, 899.00, 15, 5, 'Medium roast arabica coffee beans'),
('Green Tea (20 bags)', 'PANTRY-TEA-001', 5, 199.00, 25, 8, 'Organic green tea bags'),
('Biscuits Assorted', 'PANTRY-BISC-001', 5, 249.00, 40, 15, 'Assorted biscuits pack'),
('Bottled Water 24pk', 'PANTRY-WATER-001', 5, 299.00, 20, 8, '500ml bottled water, pack of 24');

-- Insert initial stock receipt movements (simulating initial inventory receipt)
INSERT INTO movements (product_id, type, quantity, reference_type, reference_number, notes, created_by) VALUES
(1, 'RECEIPT', 15, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(2, 'RECEIPT', 25, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(3, 'RECEIPT', 8, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(4, 'RECEIPT', 5, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(5, 'RECEIPT', 12, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(6, 'RECEIPT', 6, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(7, 'RECEIPT', 10, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(8, 'RECEIPT', 50, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(9, 'RECEIPT', 100, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(10, 'RECEIPT', 75, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(11, 'RECEIPT', 15, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(12, 'RECEIPT', 20, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(13, 'RECEIPT', 18, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(14, 'RECEIPT', 3, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(15, 'RECEIPT', 2, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(16, 'RECEIPT', 6, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(17, 'RECEIPT', 10, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(18, 'RECEIPT', 25, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(19, 'RECEIPT', 40, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(20, 'RECEIPT', 35, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(21, 'RECEIPT', 30, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(22, 'RECEIPT', 15, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(23, 'RECEIPT', 25, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(24, 'RECEIPT', 40, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1),
(25, 'RECEIPT', 20, 'RECEIPT', 'INIT-001', 'Initial stock receipt', 1);

-- Insert some historical orders (completed)
INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, status, subtotal, tax_amount, total_amount, created_by, created_at, completed_at) VALUES
('ORD-20241101-001', 'Acme Corporation', 'purchasing@acme.com', '+91-9876543210', 'COMPLETED', 17991.00, 3238.38, 21229.38, 1, '2024-11-01 10:30:00', '2024-11-01 10:30:00'),
('ORD-20241102-001', 'TechStart Inc', 'orders@techstart.io', '+91-9876543211', 'COMPLETED', 8497.00, 1529.46, 10026.46, 1, '2024-11-02 14:15:00', '2024-11-02 14:15:00'),
('ORD-20241103-001', 'Global Exports', 'procurement@globalex.com', '+91-9876543212', 'COMPLETED', 25998.00, 4679.64, 30677.64, 2, '2024-11-03 09:45:00', '2024-11-03 09:45:00'),
('ORD-20241104-001', 'Local Retail', 'buying@localretail.in', '+91-9876543213', 'COMPLETED', 5997.00, 1079.46, 7076.46, 1, '2024-11-04 11:20:00', '2024-11-04 11:20:00'),
('ORD-20241105-001', 'MegaMart', 'orders@megamart.com', '+91-9876543214', 'COMPLETED', 12495.00, 2249.10, 14744.10, 2, '2024-11-05 16:00:00', '2024-11-05 16:00:00'),
('ORD-20241106-001', 'SmallBiz Co', 'admin@smallbiz.co', '+91-9876543215', 'COMPLETED', 4497.00, 809.46, 5306.46, 1, '2024-11-06 13:30:00', '2024-11-06 13:30:00'),
('ORD-20241107-001', 'DataFlow Ltd', 'procure@dataflow.io', '+91-9876543216', 'COMPLETED', 19998.00, 3599.64, 23597.64, 1, '2024-11-07 10:00:00', '2024-11-07 10:00:00'),
('ORD-20241108-001', 'Bright Ideas', 'purchasing@brightideas.in', '+91-9876543217', 'COMPLETED', 3498.00, 629.64, 4127.64, 2, '2024-11-08 15:45:00', '2024-11-08 15:45:00'),
('ORD-20241109-001', 'Prime Services', 'orders@primesvc.com', '+91-9876543218', 'COMPLETED', 7497.00, 1349.46, 8846.46, 1, '2024-11-09 12:00:00', '2024-11-09 12:00:00'),
('ORD-20241110-001', 'NextGen Labs', 'lab@nextgen.io', '+91-9876543219', 'COMPLETED', 14995.00, 2699.10, 17694.10, 1, '2024-11-10 09:30:00', '2024-11-10 09:30:00'),
('ORD-20241111-001', 'Urban Works', 'supply@urbanworks.in', '+91-9876543220', 'COMPLETED', 8997.00, 1619.46, 10616.46, 2, '2024-11-11 14:00:00', '2024-11-11 14:00:00'),
('ORD-20241112-001', 'Coastal Trade', 'buy@coastaltrade.com', '+91-9876543221', 'COMPLETED', 5998.00, 1079.64, 7077.64, 1, '2024-11-12 11:15:00', '2024-11-12 11:15:00'),
('ORD-20241113-001', 'Mountain View', 'procure@mountainview.io', '+91-9876543222', 'COMPLETED', 10997.00, 1979.46, 12976.46, 1, '2024-11-13 16:30:00', '2024-11-13 16:30:00'),
('ORD-20241114-001', 'Sunrise Co', 'orders@sunrise.co', '+91-9876543223', 'COMPLETED', 6998.00, 1259.64, 8257.64, 2, '2024-11-14 10:45:00', '2024-11-14 10:45:00'),
('ORD-20241115-001', 'Harbor Logistics', 'supply@harborlog.com', '+91-9876543224', 'COMPLETED', 13497.00, 2429.46, 15926.46, 1, '2024-11-15 13:00:00', '2024-11-15 13:00:00');

-- Insert order lines for completed orders
-- ORD-20241101-001: 2x Wireless Mouse, 1x Mechanical Keyboard, 3x A4 Paper
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(1, 2, 2, 899.00, 1798.00),
(1, 3, 1, 4999.00, 4999.00),
(1, 8, 3, 399.00, 1197.00);

-- ORD-20241102-001: 5x USB-C Hub, 2x Monitor
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(2, 1, 5, 2499.00, 12495.00),
(2, 4, 2, 12999.00, 25998.00);

-- ORD-20241103-001: 1x Standing Desk, 2x Ergonomic Chair
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(3, 15, 1, 24999.00, 24999.00),
(3, 14, 2, 15999.00, 31998.00);

-- ORD-20241104-001: 5x Pens, 10x Sticky Notes, 2x Staplers
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(4, 9, 5, 149.00, 745.00),
(4, 10, 10, 99.00, 990.00),
(4, 11, 2, 249.00, 498.00);

-- ORD-20241105-001: 2x Laptop Stand, 3x Webcam, 2x Headphones
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(5, 5, 2, 1499.00, 2998.00),
(5, 6, 3, 2999.00, 8997.00),
(5, 7, 2, 3499.00, 6998.00);

-- ORD-20241106-001: 20x A4 Paper, 5x File Folders
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(6, 8, 20, 399.00, 7980.00),
(6, 12, 5, 299.00, 1495.00);

-- ORD-20241107-001: 4x Monitor, 1x Standing Desk
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(7, 4, 4, 12999.00, 51996.00),
(7, 15, 1, 24999.00, 24999.00);

-- ORD-20241108-001: 10x Cleaner, 5x Microfiber, 3x Trash Bags
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(8, 17, 10, 199.00, 1990.00),
(8, 18, 5, 299.00, 1495.00),
(8, 19, 3, 349.00, 1047.00);

-- ORD-20241109-001: 3x Keyboard, 2x Mouse, 5x Monitor Arm
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(9, 3, 3, 4999.00, 14997.00),
(9, 2, 2, 899.00, 1798.00),
(9, 16, 5, 2499.00, 12495.00);

-- ORD-20241110-001: 2x Standing Desk, 1x Chair
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(10, 15, 2, 24999.00, 49998.00),
(10, 14, 1, 15999.00, 15999.00);

-- ORD-20241111-001: 5x USB Hub, 3x Laptop Stand, 2x Webcam
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(11, 1, 5, 2499.00, 12495.00),
(11, 5, 3, 1499.00, 4497.00),
(11, 6, 2, 2999.00, 5998.00);

-- ORD-20241112-001: 15x Coffee, 10x Tea, 5x Biscuits
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(12, 21, 15, 899.00, 13485.00),
(12, 22, 10, 199.00, 1990.00),
(12, 23, 5, 249.00, 1245.00);

-- ORD-20241113-001: 4x Monitor, 2x Keyboard, 1x Desk
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(13, 4, 4, 12999.00, 51996.00),
(13, 3, 2, 4999.00, 9998.00),
(13, 15, 1, 24999.00, 24999.00);

-- ORD-20241114-001: 8x Cleaner, 4x Microfiber, 6x Sanitizer
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(14, 17, 8, 199.00, 1592.00),
(14, 18, 4, 299.00, 1196.00),
(14, 20, 6, 149.00, 894.00);

-- ORD-20241115-001: 3x Standing Desk, 2x Chair, 2x Monitor
INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(15, 15, 3, 24999.00, 74997.00),
(15, 14, 2, 15999.00, 31998.00),
(15, 4, 2, 12999.00, 25998.00);

-- Now insert SALE movements for completed orders
-- We'll add these as historical movements
INSERT INTO movements (product_id, type, quantity, reference_type, reference_id, reference_number, notes, created_by) VALUES
-- Order 1 sales
(2, 'SALE', 2, 'ORDER', 1, 'ORD-20241101-001', 'Sale via order ORD-20241101-001', 1),
(3, 'SALE', 1, 'ORDER', 1, 'ORD-20241101-001', 'Sale via order ORD-20241101-001', 1),
(8, 'SALE', 3, 'ORDER', 1, 'ORD-20241101-001', 'Sale via order ORD-20241101-001', 1),
-- Order 2 sales
(1, 'SALE', 5, 'ORDER', 2, 'ORD-20241102-001', 'Sale via order ORD-20241102-001', 1),
(4, 'SALE', 2, 'ORDER', 2, 'ORD-20241102-001', 'Sale via order ORD-20241102-001', 1),
-- Order 3 sales
(15, 'SALE', 1, 'ORDER', 3, 'ORD-20241103-001', 'Sale via order ORD-20241103-001', 2),
(14, 'SALE', 2, 'ORDER', 3, 'ORD-20241103-001', 'Sale via order ORD-20241103-001', 2),
-- Order 4 sales
(9, 'SALE', 5, 'ORDER', 4, 'ORD-20241104-001', 'Sale via order ORD-20241104-001', 1),
(10, 'SALE', 10, 'ORDER', 4, 'ORD-20241104-001', 'Sale via order ORD-20241104-001', 1),
(11, 'SALE', 2, 'ORDER', 4, 'ORD-20241104-001', 'Sale via order ORD-20241104-001', 1),
-- Order 5 sales
(5, 'SALE', 2, 'ORDER', 5, 'ORD-20241105-001', 'Sale via order ORD-20241105-001', 2),
(6, 'SALE', 3, 'ORDER', 5, 'ORD-20241105-001', 'Sale via order ORD-20241105-001', 2),
(7, 'SALE', 2, 'ORDER', 5, 'ORD-20241105-001', 'Sale via order ORD-20241105-001', 2),
-- Order 6 sales
(8, 'SALE', 20, 'ORDER', 6, 'ORD-20241106-001', 'Sale via order ORD-20241106-001', 1),
(12, 'SALE', 5, 'ORDER', 6, 'ORD-20241106-001', 'Sale via order ORD-20241106-001', 1),
-- Order 7 sales
(4, 'SALE', 4, 'ORDER', 7, 'ORD-20241107-001', 'Sale via order ORD-20241107-001', 1),
(15, 'SALE', 1, 'ORDER', 7, 'ORD-20241107-001', 'Sale via order ORD-20241107-001', 1),
-- Order 8 sales
(17, 'SALE', 10, 'ORDER', 8, 'ORD-20241108-001', 'Sale via order ORD-20241108-001', 2),
(18, 'SALE', 5, 'ORDER', 8, 'ORD-20241108-001', 'Sale via order ORD-20241108-001', 2),
(19, 'SALE', 3, 'ORDER', 8, 'ORD-20241108-001', 'Sale via order ORD-20241108-001', 2),
-- Order 9 sales
(3, 'SALE', 3, 'ORDER', 9, 'ORD-20241109-001', 'Sale via order ORD-20241109-001', 1),
(2, 'SALE', 2, 'ORDER', 9, 'ORD-20241109-001', 'Sale via order ORD-20241109-001', 1),
(16, 'SALE', 5, 'ORDER', 9, 'ORD-20241109-001', 'Sale via order ORD-20241109-001', 1),
-- Order 10 sales
(15, 'SALE', 2, 'ORDER', 10, 'ORD-20241110-001', 'Sale via order ORD-20241110-001', 1),
(14, 'SALE', 1, 'ORDER', 10, 'ORD-20241110-001', 'Sale via order ORD-20241110-001', 1),
-- Order 11 sales
(1, 'SALE', 5, 'ORDER', 11, 'ORD-20241111-001', 'Sale via order ORD-20241111-001', 1),
(5, 'SALE', 3, 'ORDER', 11, 'ORD-20241111-001', 'Sale via order ORD-20241111-001', 1),
(6, 'SALE', 2, 'ORDER', 11, 'ORD-20241111-001', 'Sale via order ORD-20241111-001', 1),
-- Order 12 sales
(21, 'SALE', 15, 'ORDER', 12, 'ORD-20241112-001', 'Sale via order ORD-20241112-001', 1),
(22, 'SALE', 10, 'ORDER', 12, 'ORD-20241112-001', 'Sale via order ORD-20241112-001', 1),
(23, 'SALE', 5, 'ORDER', 12, 'ORD-20241112-001', 'Sale via order ORD-20241112-001', 1),
-- Order 13 sales
(4, 'SALE', 4, 'ORDER', 13, 'ORD-20241113-001', 'Sale via order ORD-20241113-001', 1),
(3, 'SALE', 2, 'ORDER', 13, 'ORD-20241113-001', 'Sale via order ORD-20241113-001', 1),
(15, 'SALE', 1, 'ORDER', 13, 'ORD-20241113-001', 'Sale via order ORD-20241113-001', 1),
-- Order 14 sales
(17, 'SALE', 8, 'ORDER', 14, 'ORD-20241114-001', 'Sale via order ORD-20241114-001', 2),
(18, 'SALE', 4, 'ORDER', 14, 'ORD-20241114-001', 'Sale via order ORD-20241114-001', 2),
(20, 'SALE', 6, 'ORDER', 14, 'ORD-20241114-001', 'Sale via order ORD-20241114-001', 2),
-- Order 15 sales
(15, 'SALE', 3, 'ORDER', 15, 'ORD-20241115-001', 'Sale via order ORD-20241115-001', 1),
(14, 'SALE', 2, 'ORDER', 15, 'ORD-20241115-001', 'Sale via order ORD-20241115-001', 1),
(4, 'SALE', 2, 'ORDER', 15, 'ORD-20241115-001', 'Sale via order ORD-20241115-001', 1);

-- Insert some additional receipt movements (recent restocking)
INSERT INTO movements (product_id, type, quantity, reference_type, reference_number, notes, created_by) VALUES
(1, 'RECEIPT', 10, 'RECEIPT', 'REC-20241116-001', 'Restocked from supplier', 1),
(3, 'RECEIPT', 5, 'RECEIPT', 'REC-20241116-001', 'Restocked from supplier', 1),
(4, 'RECEIPT', 3, 'RECEIPT', 'REC-20241116-001', 'Restocked from supplier', 1),
(14, 'RECEIPT', 2, 'RECEIPT', 'REC-20241116-001', 'Restocked from supplier', 2),
(15, 'RECEIPT', 1, 'RECEIPT', 'REC-20241116-001', 'Restocked from supplier', 2);

-- Insert restock requests
INSERT INTO restock_requests (product_id, requested_qty, status, requested_by, approved_by, requested_at, approved_at) VALUES
(3, 10, 'RECEIVED', 1, 2, '2024-11-10 09:00:00', '2024-11-10 10:00:00'),
(4, 5, 'RECEIVED', 1, 2, '2024-11-10 09:00:00', '2024-11-10 10:00:00'),
(14, 3, 'RECEIVED', 2, 2, '2024-11-11 14:00:00', '2024-11-11 14:30:00'),
(15, 2, 'RECEIVED', 2, 2, '2024-11-11 14:00:00', '2024-11-11 14:30:00'),
(1, 20, 'AWAITING_DELIVERY', 1, 2, '2024-11-15 11:00:00', '2024-11-15 11:30:00'),
(6, 10, 'APPROVED', 1, 2, '2024-11-15 11:00:00', '2024-11-15 11:30:00'),
(7, 5, 'REQUESTED', 1, NULL, '2024-11-16 09:00:00', NULL),
(21, 30, 'REQUESTED', 1, NULL, '2024-11-16 09:00:00', NULL),
(22, 20, 'REQUESTED', 1, NULL, '2024-11-16 09:00:00', NULL);

-- Add RESTOCK movements for received restock requests
INSERT INTO movements (product_id, type, quantity, reference_type, reference_id, reference_number, notes, created_by) VALUES
(3, 'RESTOCK', 10, 'RESTOCK_REQUEST', 1, 'RR-001', 'Restock request RR-001 received', 2),
(4, 'RESTOCK', 5, 'RESTOCK_REQUEST', 2, 'RR-002', 'Restock request RR-002 received', 2),
(14, 'RESTOCK', 3, 'RESTOCK_REQUEST', 3, 'RR-003', 'Restock request RR-003 received', 2),
(15, 'RESTOCK', 2, 'RESTOCK_REQUEST', 4, 'RR-004', 'Restock request RR-004 received', 2);

-- Insert a couple of draft orders
INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, status, subtotal, tax_amount, total_amount, created_by, created_at) VALUES
('ORD-20241116-001', 'Draft Customer A', 'drafta@example.com', '+91-9876543225', 'DRAFT', 7497.00, 1349.46, 8846.46, 1, '2024-11-16 10:00:00'),
('ORD-20241116-002', 'Draft Customer B', 'draftb@example.com', '+91-9876543226', 'DRAFT', 12495.00, 2249.10, 14744.10, 2, '2024-11-16 11:30:00');

INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(16, 1, 3, 2499.00, 7497.00),
(17, 4, 1, 12999.00, 12999.00);

-- Insert a cancelled order
INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, status, subtotal, tax_amount, total_amount, created_by, created_at, cancelled_at) VALUES
('ORD-20241114-002', 'Cancelled Customer', 'cancelled@example.com', '+91-9876543227', 'CANCELLED', 4999.00, 899.82, 5898.82, 1, '2024-11-14 16:00:00', '2024-11-14 16:30:00');

INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES
(18, 3, 1, 4999.00, 4999.00);