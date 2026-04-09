

# Cupertino Link Colega Generator

## Overview
A single-page tool for Cupertino Negocios Inmobiliarios (Uruguay real estate agency) to generate unbranded "colega links" for sharing property listings from colleague agencies.

## Design
- Dark/black theme with white text matching the Cupertino brand
- Logo displayed in the header (uploaded image)
- Clean, minimal UI with good contrast

## Features

### Header
- Black background with the Cupertino logo centered

### Generator Form
1. **Searchable agency dropdown** — filterable by name or ID, containing all ~400+ agencies provided
2. **Property type toggle** — "Apartamentos" / "Casas" radio buttons
3. **Property ID input** — numeric text field
4. **"Generar Link" button** — generates the URL using the formula: `https://www.inmobiliaria.link/c/inmobiliaria_{IMB_ID}/{TYPE}/{(property_id × imb_id) + 9876}`

### Output Section
- Generated URL displayed in a styled box
- Clickable link that opens in a new tab
- "Copiar link" button with clipboard copy and "¡Link copiado!" toast confirmation

### Help Card
- Small explanation card: "¿Cómo obtener el ID de la propiedad?" with instructions to find the property ID from the colleague's listing URL

## Technical
- All logic is client-side (no backend needed)
- Spanish language throughout
- Responsive design for mobile use

