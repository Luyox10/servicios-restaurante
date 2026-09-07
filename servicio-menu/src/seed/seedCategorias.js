import dotenv from "dotenv";
import mongoose from "mongoose";
import Categoria from "../models/categoria.model.js";

dotenv.config();

const categorias = [
  { nombre: "Desayunos", descripcion: "Deliciosos desayunos para empezar el día" },
  { nombre: "Entradas", descripcion: "Entradas y aperitivos para compartir" },
  { nombre: "Platos principales", descripcion: "Platos fuertes tradicionales" },
  { nombre: "Bebidas", descripcion: "Bebidas frías y calientes" },
  { nombre: "Bebidas alcohólicas", descripcion: "Cervezas, cócteles y vinos" },
  { nombre: "Postres", descripcion: "Dulces para cerrar con broche de oro" }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Categoria.deleteMany({});
    await Categoria.insertMany(categorias);
    console.log("✅ Categorías insertadas correctamente");
    process.exit();
  } catch (error) {
    console.error("❌ Error al insertar categorías:", error);
    process.exit(1);
  }
}

seed();
