CREATE TABLE owners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    shop_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE phone_models (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (brand, model_name)
);


CREATE TABLE variants (
    id SERIAL PRIMARY KEY,
    model_id INT NOT NULL
        REFERENCES phone_models(id) ON DELETE CASCADE,
    ram_gb INT NOT NULL,
    storage_gb INT NOT NULL,
    color VARCHAR(50) NOT NULL,
    UNIQUE (model_id, ram_gb, storage_gb, color)
);


CREATE TABLE listings (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL
        REFERENCES shops(id) ON DELETE CASCADE,
    variant_id INT NOT NULL
        REFERENCES variants(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    stock_status VARCHAR(20) NOT NULL DEFAULT 'in_stock'
        CHECK (stock_status IN ('in_stock', 'low', 'out_of_stock')),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (shop_id, variant_id)
);