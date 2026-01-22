-- 1. Productos con su categoría
SELECT 
  p.nombre AS producto,
  p.precio,
  c.nombre AS categoria
FROM productos p
JOIN categorias c ON p.categoria_id = c.id;


-- 2. Productos de la categoría 'Electrónica'
SELECT 
  p.nombre,
  p.precio
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
WHERE c.nombre = 'Electrónica';


-- 3. Categorías y cantidad de productos (incluye categorías sin productos)
SELECT 
  c.nombre AS categoria,
  COUNT(p.id) AS total_productos
FROM categorias c
LEFT JOIN productos p ON c.id = p.categoria_id
GROUP BY c.id;


-- 4. Productos ordenados por precio (más caros primero)
SELECT 
  p.nombre AS producto,
  p.precio,
  c.nombre AS categoria
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
ORDER BY p.precio DESC;


-- 5. Categorías que tienen al menos 2 productos
SELECT 
  c.nombre AS categoria,
  COUNT(p.id) AS total_productos
FROM categorias c
JOIN productos p ON c.id = p.categoria_id
GROUP BY c.id
HAVING COUNT(p.id) >= 2;