/**
 * Lógica do Painel de Horas Voadas
 */

// CONFIGURAÇÃO: Insira aqui a URL gerada após a implantação do Google Apps Script
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyLefOzd8A9JIxnHaMJeVdbUmtD13aBvQz5cVnk5N0-0WR8vFU0NeDatjALhCKb8vFW/exec';

// Estado da Aplicação
let instructors = [];

// Elementos do DOM
const navLinks = document.querySelectorAll('.nav-link');
const views = document.querySelectorAll('.view');
const loadingEl = document.getElementById('loading');
const instructorCardsEl = document.getElementById('instructor-cards');
const instructorTableBody = document.querySelector('#instructor-table tbody');
const btnSync = document.getElementById('btn-sync');

// Navegação
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const targetView = e.target.getAttribute('data-view');
        
        navLinks.forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        
        views.forEach(view => {
            view.classList.remove('active');
            if (view.id === targetView) {
                view.classList.add('active');
            }
        });

        if (targetView === 'dashboard') {
            fetchData();
        }
    });
});

// Sincronização CAVOK
btnSync.addEventListener('click', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    btnSync.disabled = true;
    const originalText = btnSync.textContent;
    btnSync.textContent = 'Sincronizando...';
    
    try {
        console.log('Iniciando sincronização via:', `${WEB_APP_URL}?action=sync_cavok&date=${today}`);
        const response = await fetch(`${WEB_APP_URL}?action=sync_cavok&date=${today}`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(result.message);
            fetchData();
        } else {
            alert('Erro na sincronização: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao sincronizar:', error);
        alert('Erro ao conectar com o servidor. Verifique se o Web App está implantado como "Qualquer pessoa" e se a URL está correta.');
    } finally {
        btnSync.disabled = false;
        btnSync.textContent = originalText;
    }
});

// Busca de Dados
async function fetchData() {
    if (!WEB_APP_URL || WEB_APP_URL.includes('SUA_URL')) {
        console.warn('URL do Apps Script não configurada.');
        return;
    }

    loadingEl.style.display = 'block';
    try {
        console.log('Buscando dados de:', `${WEB_APP_URL}?action=get_data`);
        const response = await fetch(`${WEB_APP_URL}?action=get_data`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.status === 'success') {
            instructors = result.data;
            renderDashboard();
        } else {
            console.error('Erro no servidor:', result.message);
        }
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
    } finally {
        loadingEl.style.display = 'none';
    }
}

function renderDashboard() {
    // Renderizar Cards
    instructorCardsEl.innerHTML = '';
    instructors.forEach(ins => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${ins.nome}</h3>
            <p>${ins.tipo}</p>
            <div class="value">${ins.totalHoras}h</div>
        `;
        instructorCardsEl.appendChild(card);
    });

    // Renderizar Tabela
    instructorTableBody.innerHTML = '';
    instructors.forEach(ins => {
        const row = document.createElement('tr');
        const badgeClass = ins.tipo.toLowerCase() === 'clt' ? 'badge-clt' : 'badge-eventual';
        row.innerHTML = `
            <td><strong>${ins.nome}</strong></td>
            <td><span class="badge ${badgeClass}">${ins.tipo}</span></td>
            <td>${ins.totalHoras}h</td>
        `;
        instructorTableBody.appendChild(row);
    });
}

// Formulário de Cadastro
document.getElementById('form-instrutor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        nome: document.getElementById('nome').value,
        tipo: document.getElementById('tipo').value
    };

    await sendData('add_instructor', data);
    e.target.reset();
    alert('Instrutor cadastrado com sucesso!');
    fetchData();
});

async function sendData(action, data) {
    if (!WEB_APP_URL || WEB_APP_URL.includes('SUA_URL')) {
        alert('Por favor, configure a URL do Apps Script no arquivo app.js');
        return;
    }

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action, data })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        alert('Erro ao enviar dados. Verifique o console.');
    }
}

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
    if (WEB_APP_URL && !WEB_APP_URL.includes('SUA_URL')) {
        fetchData();
    }
});
