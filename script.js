// Configuration de l'API
const API_KEY = 'YOUR_SPOONACULAR_API_KEY'; // Remplacez par votre clé API
const BASE_URL = 'https://api.spoonacular.com/recipes';

// Variables globales
let currentOffset = 0;
let currentSearchTerm = '';
let currentFilters = {};
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Éléments du DOM
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const randomBtn = document.getElementById('random-btn');
const recipesContainer = document.getElementById('recipes-container');
const resultsCount = document.getElementById('results-count');
const loadMoreBtn = document.getElementById('load-more');
const spinner = document.getElementById('loading-spinner');
const modal = document.getElementById('recipe-modal');
const closeModal = document.querySelector('.close-modal');
const modalTitle = document.getElementById('modal-title');
const modalImage = document.getElementById('modal-image');
const modalTime = document.getElementById('modal-time');
const modalServings = document.getElementById('modal-servings');
const modalIngredients = document.getElementById('modal-ingredients');
const modalInstructions = document.getElementById('modal-instructions');
const printBtn = document.getElementById('print-btn');
const favoriteBtn = document.getElementById('favorite-btn');
const dietFilter = document.getElementById('diet-filter');
const typeFilter = document.getElementById('type-filter');
const ingredientFilter = document.getElementById('ingredient-filter');
const applyFiltersBtn = document.getElementById('apply-filters');

// Événements
searchBtn.addEventListener('click', handleSearch);
randomBtn.addEventListener('click', fetchRandomRecipe);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
loadMoreBtn.addEventListener('click', loadMoreRecipes);
closeModal.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
});
printBtn.addEventListener('click', printRecipe);
favoriteBtn.addEventListener('click', toggleFavorite);
applyFiltersBtn.addEventListener('click', applyFilters);

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    fetchRecipes('', { number: 12 }); // Charger des recettes au chargement de la page
});

// Fonctions
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        currentSearchTerm = searchTerm;
        currentOffset = 0;
        recipesContainer.innerHTML = '';
        fetchRecipes(searchTerm, { ...currentFilters, number: 12, offset: currentOffset });
    }
}

function applyFilters() {
    currentFilters = {};
    
    if (dietFilter.value) {
        currentFilters.diet = dietFilter.value;
    }
    
    if (typeFilter.value) {
        currentFilters.type = typeFilter.value;
    }
    
    if (ingredientFilter.value.trim()) {
        currentFilters.includeIngredients = ingredientFilter.value.trim();
    }
    
    currentOffset = 0;
    recipesContainer.innerHTML = '';
    fetchRecipes(currentSearchTerm, { ...currentFilters, number: 12, offset: currentOffset });
}

async function fetchRecipes(query = '', options = {}) {
    try {
        spinner.classList.remove('hidden');
        loadMoreBtn.classList.add('hidden');
        
        const params = new URLSearchParams({
            apiKey: API_KEY,
            ...options
        });
        
        let endpoint;
        if (query) {
            endpoint = `${BASE_URL}/complexSearch?query=${query}&${params}`;
        } else {
            endpoint = `${BASE_URL}/complexSearch?${params}`;
        }
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        displayRecipes(data.results);
        updateResultsCount(data.totalResults);
        
        if (data.offset + data.number < data.totalResults) {
            loadMoreBtn.classList.remove('hidden');
            currentOffset = data.offset + data.number;
        }
    } catch (error) {
        console.error('Error fetching recipes:', error);
        recipesContainer.innerHTML = '<p class="error">Une erreur est survenue lors de la récupération des recettes.</p>';
    } finally {
        spinner.classList.add('hidden');
    }
}

async function fetchRandomRecipe() {
    try {
        spinner.classList.remove('hidden');
        const response = await fetch(`${BASE_URL}/random?apiKey=${API_KEY}&number=1`);
        const data = await response.json();
        
        if (data.recipes && data.recipes.length > 0) {
            openRecipeModal(data.recipes[0].id);
        }
    } catch (error) {
        console.error('Error fetching random recipe:', error);
    } finally {
        spinner.classList.add('hidden');
    }
}

async function loadMoreRecipes() {
    await fetchRecipes(currentSearchTerm, { ...currentFilters, number: 12, offset: currentOffset });
}

function displayRecipes(recipes) {
    if (recipes.length === 0) {
        recipesContainer.innerHTML = '<p class="no-results">Aucune recette trouvée. Essayez une autre recherche.</p>';
        return;
    }
    
    recipes.forEach(recipe => {
        const recipeCard = document.createElement('div');
        recipeCard.className = 'recipe-card';
        recipeCard.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}" class="recipe-image">
            <div class="recipe-info">
                <h3 class="recipe-title">${recipe.title}</h3>
                <div class="recipe-meta">
                    <span>${recipe.readyInMinutes || 'N/A'} min</span>
                    <span>${recipe.servings || 'N/A'} pers.</span>
                </div>
            </div>
        `;
        
        recipeCard.addEventListener('click', () => openRecipeModal(recipe.id));
        recipesContainer.appendChild(recipeCard);
    });
}

function updateResultsCount(count) {
    if (count === 0) {
        resultsCount.textContent = 'Aucun résultat trouvé';
    } else if (count === 1) {
        resultsCount.textContent = '1 recette trouvée';
    } else {
        resultsCount.textContent = `${count} recettes trouvées`;
    }
}

async function openRecipeModal(recipeId) {
    try {
        spinner.classList.remove('hidden');
        modal.classList.add('hidden');
        
        const response = await fetch(`${BASE_URL}/${recipeId}/information?apiKey=${API_KEY}`);
        const recipe = await response.json();
        
        // Mettre à jour le modal avec les données de la recette
        modalTitle.textContent = recipe.title;
        modalImage.src = recipe.image;
        modalImage.alt = recipe.title;
        modalTime.textContent = recipe.readyInMinutes;
        modalServings.textContent = recipe.servings;
        
        // Afficher les ingrédients
        modalIngredients.innerHTML = '';
        recipe.extendedIngredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`;
            modalIngredients.appendChild(li);
        });
        
        // Afficher les instructions
        modalInstructions.innerHTML = '';
        if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
            recipe.analyzedInstructions[0].steps.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step.step;
                modalInstructions.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'Aucune instruction disponible pour cette recette.';
            modalInstructions.appendChild(li);
        }
        
        // Mettre à jour le bouton favori
        updateFavoriteButton(recipe.id);
        
        // Afficher le modal
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching recipe details:', error);
    } finally {
        spinner.classList.add('hidden');
    }
}

function updateFavoriteButton(recipeId) {
    const isFavorite = favorites.includes(recipeId);
    favoriteBtn.innerHTML = isFavorite 
        ? '<i class="fas fa-heart"></i> Retirer des favoris' 
        : '<i class="far fa-heart"></i> Ajouter aux favoris';
    favoriteBtn.style.backgroundColor = isFavorite ? '#666' : 'var(--primary-color)';
}

function toggleFavorite() {
    const recipeId = modalTitle.getAttribute('data-recipe-id') || 
                    window.location.hash.replace('#recipe-', '');
    
    if (!recipeId) return;
    
    const index = favorites.indexOf(recipeId);
    if (index === -1) {
        favorites.push(recipeId);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoriteButton(recipeId);
}

function printRecipe() {
    const printContent = `
        <h1>${modalTitle.textContent}</h1>
        <img src="${modalImage.src}" alt="${modalImage.alt}" style="max-width: 100%;">
        <p><strong>Temps de préparation:</strong> ${modalTime.textContent} minutes</p>
        <p><strong>Portions:</strong> ${modalServings.textContent}</p>
        <h2>Ingrédients</h2>
        <ul>
            ${Array.from(modalIngredients.children).map(li => `<li>${li.textContent}</li>`).join('')}
        </ul>
        <h2>Instructions</h2>
        <ol>
            ${Array.from(modalInstructions.children).map(li => `<li>${li.textContent}</li>`).join('')}
        </ol>
        <p>Recette générée par Chef's Choice - ${new Date().toLocaleDateString()}</p>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${modalTitle.textContent}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                    h1 { color: #ff6b6b; }
                    h2 { color: #666; margin-top: 20px; }
                    img { margin: 10px 0; }
                </style>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}