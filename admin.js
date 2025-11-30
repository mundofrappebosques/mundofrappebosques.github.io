// Firebase imports (loaded via CDN in HTML)
import { ref, set, get, push, remove, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
// Nota: No usamos Firebase Storage porque cobra. Las imágenes se convierten a base64.

// State
let categorias = [];
let productos = [];
let secciones = [];
let editingCategoria = null;
let editingProducto = null;
let editingSeccion = null;
let activeTab = 'productos';
let temporadaActual = null;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const tabButtons = document.querySelectorAll('.tab-btn');
const productosSection = document.getElementById('productosSection');
const categoriasSection = document.getElementById('categoriasSection');
const temporadaSection = document.getElementById('temporadaSection');
const seccionesSection = document.getElementById('seccionesSection');
const temporadasGrid = document.getElementById('temporadasGrid');
const resetTemporadaBtn = document.getElementById('resetTemporadaBtn');

// Verificar que la sección de temporada exista antes de usarla
if (temporadaSection) {
    temporadaSection.classList.remove('active');
}

// Productos Form
const productoForm = document.getElementById('productoForm');
const productoNombre = document.getElementById('productoNombre');
const productoDescripcion = document.getElementById('productoDescripcion');
let productoPrecioChico = null; // Se inicializará cuando el DOM esté listo
let productoPrecioGrande = null; // Se inicializará cuando el DOM esté listo
const productoCategoria = document.getElementById('productoCategoria');
let aplicarPrecioCategoria = null; // Se inicializará cuando el DOM esté listo
const productoImagenUrl = document.getElementById('productoImagenUrl');
const productoImagenFile = document.getElementById('productoImagenFile');
const productoImagePreview = document.getElementById('productoImagePreview');
const productoPreviewImg = document.getElementById('productoPreviewImg');
const productoUploadStatus = document.getElementById('productoUploadStatus');
const productoSubmitBtn = document.getElementById('productoSubmitBtn');
const productoCancelBtn = document.getElementById('productoCancelBtn');
const productosList = document.getElementById('productosList');
const productoFormTitle = document.getElementById('productoFormTitle');

// Categorías Form
const categoriaForm = document.getElementById('categoriaForm');
const categoriaNombre = document.getElementById('categoriaNombre');
const categoriaDescripcion = document.getElementById('categoriaDescripcion');
const categoriaImagenUrl = document.getElementById('categoriaImagenUrl');
const categoriaImagenFile = document.getElementById('categoriaImagenFile');
const categoriaImagePreview = document.getElementById('categoriaImagePreview');
const categoriaPreviewImg = document.getElementById('categoriaPreviewImg');
const categoriaUploadStatus = document.getElementById('categoriaUploadStatus');
const categoriaSubmitBtn = document.getElementById('categoriaSubmitBtn');
const categoriaCancelBtn = document.getElementById('categoriaCancelBtn');
const categoriasList = document.getElementById('categoriasList');
const categoriaFormTitle = document.getElementById('categoriaFormTitle');
const categoriaSeccion = document.getElementById('categoriaSeccion');

// Secciones Form
const seccionForm = document.getElementById('seccionForm');
const seccionNombre = document.getElementById('seccionNombre');
const seccionOrden = document.getElementById('seccionOrden');
const seccionCategoriasContainer = document.getElementById('seccionCategoriasContainer');
const seccionSubmitBtn = document.getElementById('seccionSubmitBtn');
const seccionCancelBtn = document.getElementById('seccionCancelBtn');
const seccionesList = document.getElementById('seccionesList');
const seccionFormTitle = document.getElementById('seccionFormTitle');

// Tema oscuro siempre activo - no se permite cambiar el tema

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar elementos del DOM que pueden no estar disponibles al inicio
    aplicarPrecioCategoria = document.getElementById('aplicarPrecioCategoria');
    
    // Inicializar campos de precio si no están disponibles
    if (!productoPrecioChico) {
        productoPrecioChico = document.getElementById('productoPrecioChico');
    }
    if (!productoPrecioGrande) {
        productoPrecioGrande = document.getElementById('productoPrecioGrande');
    }
    
    if (!aplicarPrecioCategoria) {
        console.error('⚠️ No se encontró el checkbox aplicarPrecioCategoria');
    } else {
        console.log('✅ Checkbox aplicarPrecioCategoria inicializado correctamente');
    }
    
    // Wait for Firebase to initialize
    await waitForFirebase();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await cargarDatos();
});

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        // Si ya está listo, resolver inmediatamente (solo necesitamos database, no storage)
        if (window.database && window.firebaseReady) {
            console.log('Firebase ya está inicializado');
            resolve();
            return;
        }
        
        // Si hay un error, rechazar
        if (window.firebaseError) {
            console.error('Error de Firebase detectado:', window.firebaseError);
            alert('Error al inicializar Firebase: ' + window.firebaseError.message);
            resolve(); // Resolver para no bloquear, pero mostrará error
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        const checkFirebase = setInterval(() => {
            attempts++;
            if (window.database && window.firebaseReady) {
                clearInterval(checkFirebase);
                console.log('Firebase inicializado correctamente');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkFirebase);
                console.error('Error: Firebase no se inicializó después de 5 segundos');
                console.error('Estado:', {
                    database: !!window.database,
                    firebaseReady: window.firebaseReady,
                    firebaseError: window.firebaseError
                });
                alert('Error: No se pudo conectar con Firebase. Por favor, recarga la página.');
                resolve(); // Resolver de todos modos para no bloquear
            }
        }, 100);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Productos form
    productoForm.addEventListener('submit', handleSubmitProducto);
    productoCancelBtn.addEventListener('click', resetFormProducto);
    productoImagenUrl.addEventListener('input', () => updateImagePreview('producto', productoImagenUrl.value));
    productoImagenFile.addEventListener('change', (e) => handleImageFileChange(e, 'producto'));
    
    // Categorías form
    categoriaForm.addEventListener('submit', handleSubmitCategoria);
    categoriaCancelBtn.addEventListener('click', resetFormCategoria);
    categoriaImagenUrl.addEventListener('input', () => updateImagePreview('categoria', categoriaImagenUrl.value));
    categoriaImagenFile.addEventListener('change', (e) => handleImageFileChange(e, 'categoria'));
    
    // Secciones form
    if (seccionForm) {
        seccionForm.addEventListener('submit', handleSubmitSeccion);
    }
    if (seccionCancelBtn) {
        seccionCancelBtn.addEventListener('click', resetFormSeccion);
    }
    
    // Temporada
    if (resetTemporadaBtn) {
        resetTemporadaBtn.addEventListener('click', () => handleCambiarTemporada(null));
    }
}

// Tab Switching
function switchTab(tab) {
    activeTab = tab;
    
    // Update buttons
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update sections
    productosSection.classList.remove('active');
    categoriasSection.classList.remove('active');
    if (seccionesSection) seccionesSection.classList.remove('active');
    temporadaSection.classList.remove('active');
    
    if (tab === 'productos') {
        productosSection.classList.add('active');
    } else if (tab === 'categorias') {
        categoriasSection.classList.add('active');
    } else if (tab === 'secciones') {
        if (seccionesSection) seccionesSection.classList.add('active');
    } else if (tab === 'temporada') {
        temporadaSection.classList.add('active');
    }
}

// Loading
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// Load Data
async function cargarDatos() {
    try {
        showLoading();
        const [categoriasData, productosData, temporadaData, seccionesData] = await Promise.all([
            getCategorias(),
            getProductos(),
            getTemporada(),
            getSecciones()
        ]);
        categorias = categoriasData;
        productos = productosData;
        temporadaActual = temporadaData;
        secciones = seccionesData;
        renderProductos();
        renderCategorias();
        renderTemporadas();
        if (typeof renderSecciones === 'function') {
            renderSecciones();
        }
        updateCategoriaSelect();
        if (typeof updateSeccionSelect === 'function') {
            updateSeccionSelect();
        }
        if (typeof updateSeccionCategoriasCheckboxes === 'function') {
            updateSeccionCategoriasCheckboxes();
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error al cargar datos: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Firebase Functions
async function getCategorias() {
    const categoriasRef = ref(window.database, 'categorias');
    const snapshot = await get(categoriasRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

async function getProductos() {
    const productosRef = ref(window.database, 'productos');
    const snapshot = await get(productosRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

async function getSecciones() {
    const seccionesRef = ref(window.database, 'secciones');
    const snapshot = await get(seccionesRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

async function addSeccion(seccion) {
    if (!window.database) {
        throw new Error('Firebase database no está disponible');
    }
    
    try {
        const seccionesRef = ref(window.database, 'secciones');
        const newSeccionRef = push(seccionesRef);
        await set(newSeccionRef, {
            nombre: seccion.nombre,
            orden: seccion.orden || 0,
            createdAt: new Date().toISOString()
        });
        return newSeccionRef.key;
    } catch (error) {
        console.error('Error en addSeccion:', error);
        throw error;
    }
}

async function updateSeccion(id, seccion) {
    const seccionRef = ref(window.database, `secciones/${id}`);
    await update(seccionRef, {
        nombre: seccion.nombre,
        orden: seccion.orden || 0,
        updatedAt: new Date().toISOString()
    });
}

async function deleteSeccion(id) {
    const seccionRef = ref(window.database, `secciones/${id}`);
    await remove(seccionRef);
}

async function addCategoria(categoria) {
    if (!window.database) {
        throw new Error('Firebase database no está disponible');
    }
    
    try {
        const categoriasRef = ref(window.database, 'categorias');
        const newCategoriaRef = push(categoriasRef);
        await set(newCategoriaRef, {
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || '',
            imagen: categoria.imagen || '',
            seccionId: categoria.seccionId || null,
            createdAt: new Date().toISOString()
        });
        return newCategoriaRef.key;
    } catch (error) {
        console.error('Error en addCategoria:', error);
        throw error;
    }
}

async function updateCategoria(id, categoria) {
    const categoriaRef = ref(window.database, `categorias/${id}`);
    await update(categoriaRef, {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion || '',
        imagen: categoria.imagen || '',
        seccionId: categoria.seccionId || null,
        updatedAt: new Date().toISOString()
    });
}

async function deleteCategoria(id) {
    const categoriaRef = ref(window.database, `categorias/${id}`);
    await remove(categoriaRef);
}

async function addProducto(producto) {
    const productosRef = ref(window.database, 'productos');
    const newProductoRef = push(productosRef);
    const productoData = {
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        categoriaId: producto.categoriaId,
        imagen: producto.imagen || '',
        createdAt: new Date().toISOString()
    };
    
    // Agregar precios solo si existen
    if (producto.precioChico !== null && producto.precioChico !== undefined) {
        productoData.precioChico = producto.precioChico;
    }
    if (producto.precioGrande !== null && producto.precioGrande !== undefined) {
        productoData.precioGrande = producto.precioGrande;
    }
    
    await set(newProductoRef, productoData);
    return newProductoRef.key;
}

async function updateProducto(id, producto) {
    const productoRef = ref(window.database, `productos/${id}`);
    const productoData = {
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        categoriaId: producto.categoriaId,
        imagen: producto.imagen || '',
        updatedAt: new Date().toISOString()
    };
    
    // Agregar precios solo si existen
    if (producto.precioChico !== null && producto.precioChico !== undefined) {
        productoData.precioChico = producto.precioChico;
    }
    if (producto.precioGrande !== null && producto.precioGrande !== undefined) {
        productoData.precioGrande = producto.precioGrande;
    }
    
    await update(productoRef, productoData);
}

// Actualizar todos los productos de una categoría con los mismos precios
async function updateProductosByCategoria(categoriaId, precioChico, precioGrande, excluirProductoId = null) {
    if (!categoriaId || (!precioChico && !precioGrande)) {
        console.error('updateProductosByCategoria: categoriaId o precios no válidos', { categoriaId, precioChico, precioGrande });
        return 0;
    }
    
    try {
        const productosRef = ref(window.database, 'productos');
        const snapshot = await get(productosRef);
        
        if (!snapshot.exists()) {
            console.log('No hay productos en la base de datos');
            return 0;
        }
        
        const productosData = snapshot.val();
        const updates = {};
        let productosActualizados = 0;
        
        // Buscar todos los productos de la categoría y preparar las actualizaciones
        Object.keys(productosData).forEach(productoId => {
            const producto = productosData[productoId];
            // Excluir el producto actual si se especifica
            if (excluirProductoId && productoId === excluirProductoId) {
                return;
            }
            
            if (producto.categoriaId === categoriaId) {
                if (precioChico !== null && precioChico !== undefined) {
                    updates[`productos/${productoId}/precioChico`] = precioChico;
                }
                if (precioGrande !== null && precioGrande !== undefined) {
                    updates[`productos/${productoId}/precioGrande`] = precioGrande;
                }
                updates[`productos/${productoId}/updatedAt`] = new Date().toISOString();
                productosActualizados++;
            }
        });
        
        // Aplicar todas las actualizaciones en una sola operación
        if (Object.keys(updates).length > 0) {
            const dbRef = ref(window.database);
            await update(dbRef, updates);
            console.log(`✅ Actualizados ${productosActualizados} productos de la categoría ${categoriaId}`);
            return productosActualizados;
        } else {
            console.log('No se encontraron productos de la categoría para actualizar');
        }
        
        return 0;
    } catch (error) {
        console.error('Error en updateProductosByCategoria:', error);
        throw error;
    }
}

async function deleteProducto(id) {
    const productoRef = ref(window.database, `productos/${id}`);
    await remove(productoRef);
}

// Temporada Functions
async function getTemporada() {
    const temporadaRef = ref(window.database, 'config/temporada');
    const snapshot = await get(temporadaRef);
    if (snapshot.exists()) {
        return snapshot.val();
    }
    return null; // null = sin temporada
}

async function updateTemporada(temporada) {
    const temporadaRef = ref(window.database, 'config/temporada');
    await set(temporadaRef, temporada);
}

async function handleCambiarTemporada(temporada) {
    try {
        showLoading();
        await updateTemporada(temporada);
        temporadaActual = temporada;
        renderTemporadas();
        const mensaje = temporada ? `Temporada cambiada a: ${getTemporadaNombre(temporada)}` : 'Temporada removida';
        alert(mensaje);
    } catch (error) {
        console.error('Error al cambiar temporada:', error);
        alert('Error al cambiar temporada: ' + error.message);
    } finally {
        hideLoading();
    }
}

function getTemporadaNombre(temporada) {
    const nombres = {
        'invierno': 'Invierno',
        'primavera': 'Primavera',
        'otono': 'Otoño'
    };
    return nombres[temporada] || temporada;
}

function renderTemporadas() {
    if (!temporadasGrid) return;
    
    const temporadas = [
        {
            id: 'invierno',
            nombre: 'Invierno',
            icon: '❄️',
            descripcion: 'Efecto de nieve'
        },
        {
            id: 'primavera',
            nombre: 'Primavera',
            icon: '🌸',
            descripcion: 'Flores y pétalos cayendo'
        },
        {
            id: 'otono',
            nombre: 'Otoño',
            icon: '🍂',
            descripcion: 'Hojas de otoño cayendo'
        }
    ];
    
    temporadasGrid.innerHTML = temporadas.map(temp => {
        const isActive = temporadaActual === temp.id;
        return `
            <div class="temporada-card ${isActive ? 'active' : ''}" data-temporada="${temp.id}">
                <div class="temporada-icon">${temp.icon}</div>
                <h3>${temp.nombre}</h3>
                <p>${temp.descripcion}</p>
                ${isActive ? '<span class="temporada-active-badge">Activa</span>' : ''}
            </div>
        `;
    }).join('');
    
    // Add event listeners
    temporadasGrid.querySelectorAll('.temporada-card').forEach(card => {
        card.addEventListener('click', () => {
            const temporada = card.dataset.temporada;
            handleCambiarTemporada(temporada);
        });
    });
}

// Convertir imagen a Base64 (sin usar Firebase Storage)
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        // Verificar tamaño del archivo (máximo 1MB para base64 - recomendado para evitar que la BD sea muy grande)
        const maxSize = 1 * 1024 * 1024; // 1MB
        if (file.size > maxSize) {
            reject(new Error('El archivo es demasiado grande. Máximo 1MB. Comprime la imagen antes de subirla.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        
        reader.onerror = (error) => {
            reject(new Error('Error al leer el archivo: ' + error));
        };
        
        reader.readAsDataURL(file);
    });
}

// Función de compatibilidad (ahora convierte a base64)
async function uploadImage(file, path = 'productos') {
    try {
        console.log('Convirtiendo imagen a base64:', file.name);
        const base64String = await convertImageToBase64(file);
        console.log('Imagen convertida exitosamente');
        return base64String;
    } catch (error) {
        console.error('Error al convertir imagen:', error);
        throw error;
    }
}

async function handleImageFileChange(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    
    const uploadStatus = type === 'categoria' ? categoriaUploadStatus : productoUploadStatus;
    const imageUrl = type === 'categoria' ? categoriaImagenUrl : productoImagenUrl;
    
    // Verificar tamaño del archivo (máximo 1MB para base64)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
        uploadStatus.classList.remove('hidden', 'success', 'error', 'uploading');
        uploadStatus.classList.add('error');
        uploadStatus.textContent = 'Error: El archivo es demasiado grande. Máximo 1MB. Comprime la imagen o usa una URL.';
        return;
    }
    
    // Verificar tipo de archivo
    if (!file.type.startsWith('image/')) {
        uploadStatus.classList.remove('hidden', 'success', 'error', 'uploading');
        uploadStatus.classList.add('error');
        uploadStatus.textContent = 'Error: El archivo debe ser una imagen.';
        return;
    }
    
    try {
        uploadStatus.classList.remove('hidden', 'success', 'error', 'uploading');
        uploadStatus.classList.add('uploading');
        uploadStatus.textContent = 'Procesando imagen...';
        
        console.log('Iniciando conversión para:', type, 'Archivo:', file.name, 'Tamaño:', file.size);
        
        // Convertir a base64 (no usa Storage, es instantáneo)
        const url = await uploadImage(file, type === 'categoria' ? 'categorias' : 'productos');
        
        console.log('Conversión exitosa, imagen guardada como base64');
        imageUrl.value = url;
        updateImagePreview(type, url);
        
        uploadStatus.classList.remove('uploading');
        uploadStatus.classList.add('success');
        uploadStatus.textContent = 'Imagen procesada correctamente';
        
        setTimeout(() => {
            uploadStatus.classList.add('hidden');
        }, 3000);
    } catch (error) {
        console.error('Error completo en handleImageFileChange:', error);
        uploadStatus.classList.remove('uploading');
        uploadStatus.classList.add('error');
        
        let errorMessage = 'Error al procesar imagen: ';
        if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += error.toString() || 'Error desconocido';
        }
        
        uploadStatus.textContent = errorMessage;
        console.error('Mensaje de error mostrado:', errorMessage);
        
        // No ocultar el error automáticamente para que el usuario lo vea
        setTimeout(() => {
            uploadStatus.classList.add('hidden');
        }, 5000);
    } finally {
        // Asegurarse de que siempre se quite la clase uploading
        uploadStatus.classList.remove('uploading');
    }
}

function updateImagePreview(type, url) {
    if (!url) {
        if (type === 'categoria') {
            categoriaImagePreview.classList.add('hidden');
        } else {
            productoImagePreview.classList.add('hidden');
        }
        return;
    }
    
    if (type === 'categoria') {
        categoriaPreviewImg.src = url;
        categoriaImagePreview.classList.remove('hidden');
    } else {
        productoPreviewImg.src = url;
        productoImagePreview.classList.remove('hidden');
    }
}

// Categorías Handlers
async function handleSubmitCategoria(e) {
    e.preventDefault();
    
    if (!categoriaNombre.value.trim()) {
        alert('El nombre de la categoría es requerido');
        return;
    }
    
    // Verificar que Firebase esté disponible
    if (!window.database) {
        alert('Error: Firebase no está disponible. Por favor, recarga la página.');
        console.error('Firebase database no está disponible');
        return;
    }
    
    try {
        showLoading();
        const categoriaData = {
            nombre: categoriaNombre.value.trim(),
            descripcion: categoriaDescripcion.value.trim(),
            imagen: categoriaImagenUrl.value.trim(),
            seccionId: categoriaSeccion && categoriaSeccion.value ? categoriaSeccion.value : null
        };
        
        console.log('Intentando guardar categoría:', categoriaData);
        
        if (editingCategoria) {
            await updateCategoria(editingCategoria.id, categoriaData);
            alert('Categoría actualizada correctamente');
        } else {
            const newId = await addCategoria(categoriaData);
            console.log('Categoría agregada con ID:', newId);
            alert('Categoría agregada correctamente');
        }
        
        resetFormCategoria();
        await cargarDatos();
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        console.error('Detalles del error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        alert('Error al guardar categoría: ' + error.message);
    } finally {
        hideLoading();
    }
}

function handleEditCategoria(categoria) {
    editingCategoria = categoria;
    categoriaNombre.value = categoria.nombre || '';
    categoriaDescripcion.value = categoria.descripcion || '';
    categoriaImagenUrl.value = categoria.imagen || '';
    if (categoriaSeccion) {
        categoriaSeccion.value = categoria.seccionId || '';
    }
    updateImagePreview('categoria', categoria.imagen);
    categoriaFormTitle.textContent = 'Editar Categoría';
    categoriaSubmitBtn.textContent = 'Actualizar Categoría';
    categoriaCancelBtn.classList.remove('hidden');
    
    // Scroll to form
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleDeleteCategoria(id) {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    
    try {
        showLoading();
        await deleteCategoria(id);
        await cargarDatos();
        alert('Categoría eliminada correctamente');
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        alert('Error al eliminar categoría: ' + error.message);
    } finally {
        hideLoading();
    }
}

function resetFormCategoria() {
    categoriaForm.reset();
    editingCategoria = null;
    categoriaImagePreview.classList.add('hidden');
    categoriaUploadStatus.classList.add('hidden');
    categoriaFormTitle.textContent = 'Nueva Categoría';
    categoriaSubmitBtn.textContent = 'Agregar Categoría';
    categoriaCancelBtn.classList.add('hidden');
}

// Productos Handlers
async function handleSubmitProducto(e) {
    e.preventDefault();
    
    // Asegurar que los campos de precio estén inicializados
    if (!productoPrecioChico) {
        productoPrecioChico = document.getElementById('productoPrecioChico');
    }
    if (!productoPrecioGrande) {
        productoPrecioGrande = document.getElementById('productoPrecioGrande');
    }
    
    // Validar que al menos haya un precio
    const precioChico = (productoPrecioChico && productoPrecioChico.value) ? parseFloat(productoPrecioChico.value) : null;
    const precioGrande = (productoPrecioGrande && productoPrecioGrande.value) ? parseFloat(productoPrecioGrande.value) : null;
    
    if (!productoNombre.value.trim() || !productoCategoria.value) {
        alert('Nombre y categoría son requeridos');
        return;
    }
    
    if (!precioChico && !precioGrande) {
        alert('Debes ingresar al menos un precio (chico o grande)');
        return;
    }
    
    try {
        showLoading();
        const categoriaId = productoCategoria.value;
        
        // Verificar que el checkbox existe y está marcado
        if (!aplicarPrecioCategoria) {
            aplicarPrecioCategoria = document.getElementById('aplicarPrecioCategoria');
        }
        
        const aplicarPrecioATodos = aplicarPrecioCategoria ? aplicarPrecioCategoria.checked : false;
        
        console.log('Guardando producto:', {
            precioChico,
            precioGrande,
            categoriaId,
            aplicarPrecioATodos,
            checkboxExiste: !!aplicarPrecioCategoria,
            checkboxChecked: aplicarPrecioCategoria ? aplicarPrecioCategoria.checked : 'N/A'
        });
        
        const productoData = {
            nombre: productoNombre.value.trim(),
            descripcion: productoDescripcion.value.trim(),
            precioChico: precioChico,
            precioGrande: precioGrande,
            categoriaId: categoriaId,
            imagen: productoImagenUrl.value.trim()
            // Los productos siempre están disponibles si están en la categoría
        };
        
        if (editingProducto) {
            // Actualizar el producto individual primero
            await updateProducto(editingProducto.id, productoData);
            
            // Si está marcado aplicar precio a toda la categoría, actualizar los demás productos
            if (aplicarPrecioATodos && categoriaId) {
                const productosActualizados = await updateProductosByCategoria(categoriaId, precioChico, precioGrande, editingProducto.id);
                if (productosActualizados > 0) {
                    alert(`Producto actualizado correctamente.\nSe actualizaron los precios de ${productosActualizados} otro(s) producto(s) de esta categoría.`);
                } else {
                    alert('Producto actualizado correctamente.\nNo hay otros productos en esta categoría para actualizar.');
                }
            } else {
                alert('Producto actualizado correctamente');
            }
        } else {
            // Agregar el nuevo producto y obtener su ID
            const nuevoProductoId = await addProducto(productoData);
            
            // Si está marcado aplicar precio a toda la categoría, actualizar los demás productos
            if (aplicarPrecioATodos && categoriaId) {
                const productosActualizados = await updateProductosByCategoria(categoriaId, precioChico, precioGrande, nuevoProductoId);
                if (productosActualizados > 0) {
                    alert(`Producto agregado correctamente.\nSe aplicaron los precios a ${productosActualizados} otro(s) producto(s) de esta categoría.`);
                } else {
                    alert('Producto agregado correctamente.\nNo hay otros productos en esta categoría para actualizar.');
                }
            } else {
                alert('Producto agregado correctamente');
            }
        }
        
        resetFormProducto();
        await cargarDatos();
    } catch (error) {
        console.error('Error al guardar producto:', error);
        alert('Error al guardar producto: ' + error.message);
    } finally {
        hideLoading();
    }
}

function handleEditProducto(producto) {
    editingProducto = producto;
    productoNombre.value = producto.nombre || '';
    productoDescripcion.value = producto.descripcion || '';
    
    // Asegurar que los campos de precio estén inicializados
    if (!productoPrecioChico) {
        productoPrecioChico = document.getElementById('productoPrecioChico');
    }
    if (!productoPrecioGrande) {
        productoPrecioGrande = document.getElementById('productoPrecioGrande');
    }
    
    // Cargar precios chico y grande (o el precio antiguo para compatibilidad)
    if (productoPrecioChico) {
        if (producto.precioChico !== null && producto.precioChico !== undefined) {
            productoPrecioChico.value = producto.precioChico.toString();
        } else if (producto.precio && !producto.precioGrande) {
            // Compatibilidad: si tiene precio antiguo pero no grande, ponerlo en chico
            productoPrecioChico.value = producto.precio.toString();
        } else {
            productoPrecioChico.value = '';
        }
    }
    
    if (productoPrecioGrande) {
        if (producto.precioGrande !== null && producto.precioGrande !== undefined) {
            productoPrecioGrande.value = producto.precioGrande.toString();
        } else {
            productoPrecioGrande.value = '';
        }
    }
    
    productoCategoria.value = producto.categoriaId || '';
    productoImagenUrl.value = producto.imagen || '';
    updateImagePreview('producto', producto.imagen);
    productoFormTitle.textContent = 'Editar Producto';
    productoSubmitBtn.textContent = 'Actualizar Producto';
    productoCancelBtn.classList.remove('hidden');
    
    // Scroll to form
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleDeleteProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
        showLoading();
        await deleteProducto(id);
        await cargarDatos();
        alert('Producto eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        alert('Error al eliminar producto: ' + error.message);
    } finally {
        hideLoading();
    }
}

function resetFormProducto() {
    productoForm.reset();
    if (aplicarPrecioCategoria) {
        aplicarPrecioCategoria.checked = false; // Restablecer checkbox de aplicar precio
    }
    editingProducto = null;
    productoImagePreview.classList.add('hidden');
    productoUploadStatus.classList.add('hidden');
    productoFormTitle.textContent = 'Nuevo Producto';
    productoSubmitBtn.textContent = 'Agregar Producto';
    productoCancelBtn.classList.add('hidden');
}

// Update Categoria Select
function updateCategoriaSelect() {
    if (!productoCategoria) {
        console.error('El elemento productoCategoria no existe');
        return;
    }
    
    productoCategoria.innerHTML = '<option value="">Seleccionar categoría</option>';
    
    if (!categorias || categorias.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay categorías disponibles - Crea una categoría primero';
        option.disabled = true;
        option.selected = true;
        productoCategoria.appendChild(option);
        console.warn('No hay categorías disponibles para mostrar');
        return;
    }
    
    // Ordenar categorías por nombre
    const categoriasOrdenadas = [...categorias].sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
    });
    
    categoriasOrdenadas.forEach(cat => {
        if (cat && cat.nombre && cat.id) {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre.trim() || 'Sin nombre';
            option.style.color = '';
            option.style.backgroundColor = '';
            productoCategoria.appendChild(option);
        }
    });
    
    console.log(`✅ Categorías cargadas en el select: ${categoriasOrdenadas.length} categorías`);
}

// Render Functions
function renderProductos() {
    if (productos.length === 0) {
        productosList.innerHTML = '<div class="empty-state"><p>No hay productos registrados</p></div>';
        return;
    }
    
    // Agrupar productos por categoría
    const productosPorCategoria = {};
    
    // Primero, agregar categorías que tienen productos
    productos.forEach(producto => {
        const categoriaId = producto.categoriaId || 'sin-categoria';
        if (!productosPorCategoria[categoriaId]) {
            productosPorCategoria[categoriaId] = {
                categoria: categorias.find(c => c.id === categoriaId),
                productos: []
            };
        }
        productosPorCategoria[categoriaId].productos.push(producto);
    });
    
    // Crear HTML con categorías expandibles
    let html = '';
    
    // Mostrar categorías con productos primero
    Object.keys(productosPorCategoria).forEach(categoriaId => {
        const grupo = productosPorCategoria[categoriaId];
        const categoria = grupo.categoria;
        const categoriaNombre = categoria?.nombre || 'Sin categoría';
        const productosCount = grupo.productos.length;
        const categoriaIdSafe = categoriaId.replace(/[^a-zA-Z0-9]/g, '-');
        
        html += `
            <div class="category-group">
                <div class="category-header" data-categoria-id="${categoriaIdSafe}">
                    <div class="category-header-content">
                        ${categoria?.imagen ? `
                            <div class="category-header-image">
                                <img src="${categoria.imagen}" alt="${categoriaNombre}">
                            </div>
                        ` : ''}
                        <div class="category-header-info">
                            <h3>${categoriaNombre}</h3>
                            <span class="category-count">${productosCount} producto${productosCount !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <button class="category-toggle" aria-label="Expandir/Cerrar">
                        <span class="toggle-icon">▼</span>
                    </button>
                </div>
                <div class="category-products" id="categoria-${categoriaIdSafe}">
                    ${grupo.productos.map(producto => `
                        <div class="item-card">
                            ${producto.imagen ? `
                                <div class="item-image">
                                    <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.style.display='none'; this.parentElement.style.background='rgba(255,255,255,0.05)';">
                                </div>
                            ` : ''}
                            <div class="item-info">
                                <h3>${producto.nombre}</h3>
                                ${producto.descripcion ? `<p>${producto.descripcion}</p>` : ''}
                                <div class="item-details">
                                    <span class="price">${(() => {
                                        const precioChico = producto.precioChico || (producto.precio && !producto.precioGrande ? producto.precio : null);
                                        const precioGrande = producto.precioGrande;
                                        if (precioChico && precioGrande) {
                                            return `Ch $${precioChico.toFixed(0)} | Gr $${precioGrande.toFixed(0)}`;
                                        } else if (precioChico) {
                                            return `$${precioChico.toFixed(0)}`;
                                        } else if (precioGrande) {
                                            return `$${precioGrande.toFixed(0)}`;
                                        } else {
                                            return `$${producto.precio?.toFixed(0) || '0'}`;
                                        }
                                    })()}</span>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="btn btn-primary" data-action="edit-producto" data-id="${producto.id}">
                                    Editar
                                </button>
                                <button class="btn btn-danger" data-action="delete-producto" data-id="${producto.id}">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    productosList.innerHTML = html;
    
    // Agregar event listeners para expandir/colapsar categorías
    productosList.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Prevenir que se active si se hace clic en un botón dentro del header
            if (e.target.closest('button') && !e.target.closest('.category-toggle')) {
                return;
            }
            
            const categoriaId = header.dataset.categoriaId;
            const productsContainer = document.getElementById(`categoria-${categoriaId}`);
            const toggleIcon = header.querySelector('.toggle-icon');
            const categoryGroup = header.closest('.category-group');
            
            if (productsContainer && categoryGroup) {
                const isExpanded = categoryGroup.classList.contains('expanded');
                
                if (isExpanded) {
                    categoryGroup.classList.remove('expanded');
                } else {
                    categoryGroup.classList.add('expanded');
                }
            }
        });
    });
    
    // Add event listeners for productos
    productosList.querySelectorAll('[data-action="edit-producto"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevenir que active el toggle de categoría
            const producto = productos.find(p => p.id === btn.dataset.id);
            if (producto) handleEditProducto(producto);
        });
    });
    
    productosList.querySelectorAll('[data-action="delete-producto"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevenir que active el toggle de categoría
            handleDeleteProducto(btn.dataset.id);
        });
    });
    
    // Prevenir que los clics en item-card activen el toggle
    productosList.querySelectorAll('.category-products .item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevenir propagación al header de categoría
        });
    });
}

function renderCategorias() {
    if (categorias.length === 0) {
        categoriasList.innerHTML = '<div class="empty-state"><p>No hay categorías registradas</p></div>';
        return;
    }
    
    categoriasList.innerHTML = categorias.map(categoria => `
        <div class="item-card">
            ${categoria.imagen ? `
                <div class="item-image">
                    <img src="${categoria.imagen}" alt="${categoria.nombre}" onerror="this.style.display='none'; this.parentElement.style.background='rgba(255,255,255,0.05)';">
                </div>
            ` : '<div class="item-image" style="background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;"><span style="font-size: 3rem; opacity: 0.3;">📁</span></div>'}
            <div class="item-info">
                <h3>${categoria.nombre || 'Sin nombre'}</h3>
                ${categoria.descripcion ? `<p>${categoria.descripcion}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn btn-primary" data-action="edit-categoria" data-id="${categoria.id}">
                    Editar
                </button>
                <button class="btn btn-danger" data-action="delete-categoria" data-id="${categoria.id}">
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for categorias
    categoriasList.querySelectorAll('[data-action="edit-categoria"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const categoria = categorias.find(c => c.id === btn.dataset.id);
            if (categoria) handleEditCategoria(categoria);
        });
    });
    
    categoriasList.querySelectorAll('[data-action="delete-categoria"]').forEach(btn => {
        btn.addEventListener('click', () => {
            handleDeleteCategoria(btn.dataset.id);
        });
    });
}

// Update Seccion Select in Categorias Form
function updateSeccionSelect() {
    if (!categoriaSeccion) return;
    
    categoriaSeccion.innerHTML = '<option value="">Sin sección</option>';
    
    if (!secciones || secciones.length === 0) {
        return;
    }
    
    // Ordenar secciones por orden
    const seccionesOrdenadas = [...secciones].sort((a, b) => {
        const ordenA = a.orden || 0;
        const ordenB = b.orden || 0;
        return ordenA - ordenB;
    });
    
    seccionesOrdenadas.forEach(seccion => {
        if (seccion && seccion.nombre && seccion.id) {
            const option = document.createElement('option');
            option.value = seccion.id;
            option.textContent = seccion.nombre.trim();
            categoriaSeccion.appendChild(option);
        }
    });
}

// Secciones Handlers
async function handleSubmitSeccion(e) {
    e.preventDefault();
    
    if (!seccionNombre.value.trim()) {
        alert('El nombre de la sección es requerido');
        return;
    }
    
    if (!window.database) {
        alert('Error: Firebase no está disponible. Por favor, recarga la página.');
        return;
    }
    
    try {
        showLoading();
        const seccionData = {
            nombre: seccionNombre.value.trim(),
            orden: parseInt(seccionOrden.value) || 0
        };
        
        // Obtener categorías seleccionadas
        const categoriaIds = getSeccionCategoriasSeleccionadas();
        
        if (categoriaIds.length === 0) {
            alert('Debes seleccionar al menos una categoría para esta sección');
            return;
        }
        
        let seccionId;
        if (editingSeccion) {
            seccionId = editingSeccion.id;
            await updateSeccion(seccionId, seccionData);
            // Actualizar categorías de la sección
            await updateCategoriasDeSeccion(seccionId, categoriaIds);
            alert('Sección actualizada correctamente');
        } else {
            seccionId = await addSeccion(seccionData);
            // Actualizar categorías de la sección
            await updateCategoriasDeSeccion(seccionId, categoriaIds);
            alert('Sección agregada correctamente');
        }
        
        resetFormSeccion();
        await cargarDatos();
    } catch (error) {
        console.error('Error al guardar sección:', error);
        alert('Error al guardar sección: ' + error.message);
    } finally {
        hideLoading();
    }
}

function handleEditSeccion(seccion) {
    editingSeccion = seccion;
    seccionNombre.value = seccion.nombre || '';
    seccionOrden.value = seccion.orden || 0;
    seccionFormTitle.textContent = 'Editar Sección';
    seccionSubmitBtn.textContent = 'Actualizar Sección';
    seccionCancelBtn.classList.remove('hidden');
    
    // Actualizar checkboxes para mostrar las categorías seleccionadas
    updateSeccionCategoriasCheckboxes();
    
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleDeleteSeccion(id) {
    // Verificar si hay categorías usando esta sección
    const categoriasEnSeccion = categorias.filter(c => c.seccionId === id);
    
    if (!confirm('¿Estás seguro de eliminar esta sección?')) return;
    
    try {
        showLoading();
        
        // Primero, quitar todas las categorías de esta sección
        if (categoriasEnSeccion.length > 0) {
            await updateCategoriasDeSeccion(id, []);
        }
        
        // Luego, eliminar la sección
        await deleteSeccion(id);
        await cargarDatos();
        alert('Sección eliminada correctamente');
    } catch (error) {
        console.error('Error al eliminar sección:', error);
        alert('Error al eliminar sección: ' + error.message);
    } finally {
        hideLoading();
    }
}

function resetFormSeccion() {
    if (seccionForm) seccionForm.reset();
    editingSeccion = null;
    if (seccionFormTitle) seccionFormTitle.textContent = 'Nueva Sección';
    if (seccionSubmitBtn) seccionSubmitBtn.textContent = 'Agregar Sección';
    if (seccionCancelBtn) seccionCancelBtn.classList.add('hidden');
    updateSeccionCategoriasCheckboxes();
}

// Actualizar checkboxes de categorías en el formulario de secciones
function updateSeccionCategoriasCheckboxes() {
    if (!seccionCategoriasContainer) return;
    
    if (categorias.length === 0) {
        seccionCategoriasContainer.innerHTML = '<div class="empty-state"><p>No hay categorías disponibles. Crea categorías primero.</p></div>';
        return;
    }
    
    // Obtener las categorías seleccionadas (si estamos editando)
    const categoriasSeleccionadas = editingSeccion 
        ? categorias.filter(c => c.seccionId === editingSeccion.id).map(c => c.id)
        : [];
    
    // Ordenar categorías por nombre
    const categoriasOrdenadas = [...categorias].sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
    });
    
    let html = '<div class="checkboxes-container">';
    categoriasOrdenadas.forEach(categoria => {
        const isChecked = categoriasSeleccionadas.includes(categoria.id);
        const categoriaIdSafe = categoria.id.replace(/[^a-zA-Z0-9]/g, '-');
        html += `
            <div class="checkbox-item">
                <label>
                    <input type="checkbox" 
                           class="categoria-checkbox" 
                           value="${categoria.id}" 
                           data-categoria-id="${categoria.id}"
                           ${isChecked ? 'checked' : ''}>
                    <span>${categoria.nombre || 'Sin nombre'}</span>
                </label>
            </div>
        `;
    });
    html += '</div>';
    
    seccionCategoriasContainer.innerHTML = html;
}

// Función para obtener las categorías seleccionadas
function getSeccionCategoriasSeleccionadas() {
    if (!seccionCategoriasContainer) return [];
    const checkboxes = seccionCategoriasContainer.querySelectorAll('.categoria-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Función para actualizar categorías de una sección
async function updateCategoriasDeSeccion(seccionId, categoriaIds) {
    // Primero, quitar todas las categorías que pertenecían a esta sección
    const categoriasActuales = categorias.filter(c => c.seccionId === seccionId);
    for (const categoria of categoriasActuales) {
        if (!categoriaIds.includes(categoria.id)) {
            // Quitar la sección de esta categoría
            await updateCategoria(categoria.id, {
                nombre: categoria.nombre,
                descripcion: categoria.descripcion || '',
                imagen: categoria.imagen || '',
                seccionId: null
            });
        }
    }
    
    // Luego, agregar las nuevas categorías seleccionadas a esta sección
    for (const categoriaId of categoriaIds) {
        const categoria = categorias.find(c => c.id === categoriaId);
        if (categoria && categoria.seccionId !== seccionId) {
            // Actualizar la categoría para que pertenezca a esta sección
            await updateCategoria(categoria.id, {
                nombre: categoria.nombre,
                descripcion: categoria.descripcion || '',
                imagen: categoria.imagen || '',
                seccionId: seccionId
            });
        }
    }
}

function renderSecciones() {
    if (!seccionesList) return;
    
    if (secciones.length === 0) {
        seccionesList.innerHTML = '<div class="empty-state"><p>No hay secciones registradas</p></div>';
        return;
    }
    
    // Ordenar secciones por orden
    const seccionesOrdenadas = [...secciones].sort((a, b) => {
        const ordenA = a.orden || 0;
        const ordenB = b.orden || 0;
        return ordenA - ordenB;
    });
    
    seccionesList.innerHTML = seccionesOrdenadas.map(seccion => {
        const categoriasEnSeccion = categorias.filter(c => c.seccionId === seccion.id);
        return `
            <div class="item-card">
                <div class="item-info">
                    <h3>${seccion.nombre || 'Sin nombre'}</h3>
                    <p>Orden: ${seccion.orden || 0} | Categorías: ${categoriasEnSeccion.length}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary" data-action="edit-seccion" data-id="${seccion.id}">
                        Editar
                    </button>
                    <button class="btn btn-danger" data-action="delete-seccion" data-id="${seccion.id}">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for secciones
    seccionesList.querySelectorAll('[data-action="edit-seccion"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const seccion = secciones.find(s => s.id === btn.dataset.id);
            if (seccion) handleEditSeccion(seccion);
        });
    });
    
    seccionesList.querySelectorAll('[data-action="delete-seccion"]').forEach(btn => {
        btn.addEventListener('click', () => {
            handleDeleteSeccion(btn.dataset.id);
        });
    });
}

