/** @OnlyCurrentDoc */

/**
 * Backend para o Sistema de Horas Voadas - Versão 2.2 (Correção de Resposta API)
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Crie uma nova Planilha do Google.
 * 2. Renomeie as abas para: "Instrutores" e "Horas".
 * 3. Cabeçalhos "Instrutores" (Linha 1): Nome | Tipo
 * 4. Cabeçalhos "Horas" (Linha 1): Instrutor | Data | Horas | CavokId
 * 5. Vá em Extensões > Apps Script e COLE ESTE CÓDIGO INTEIRO.
 * 6. Se o erro de permissão persistir, siga os passos do appsscript.json.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const CAVOK_API_URL = 'http://voesafe.cavok.in/api/voos/';
const CAVOK_AUTH = 'Basic ' + Utilities.base64Encode('safe.ia@voesafe.com.br:Safeia1234%');

/**
 * Função principal para receber requisições GET do painel
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'get_data') {
    return handleGetData();
  } else if (action === 'sync_cavok') {
    const date = e.parameter.date || Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
    return handleSyncCavok(date);
  }
  
  return createJsonResponse({status: 'error', message: 'Ação inválida'});
}

/**
 * Função principal para receber requisições POST do painel
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    if (action === 'add_instructor') {
      return handleAddInstructor(params.data);
    }
    
    return createJsonResponse({status: 'error', message: 'Ação inválida'});
  } catch (error) {
    return createJsonResponse({status: 'error', message: error.toString()});
  }
}

/**
 * Sincroniza voos do CAVOK para a Planilha
 * @param {string} date Data no formato yyyy-MM-dd
 */
function handleSyncCavok(date) {
  try {
    const syncDate = date || Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
    console.log("--- Iniciando Sincronização CAVOK ---");
    console.log("Data alvo: " + syncDate);
    
    const url = `${CAVOK_API_URL}?data=${syncDate}`;
    const options = {
      'method': 'get',
      'headers': { 'Authorization': CAVOK_AUTH },
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    const content = JSON.parse(responseText);
    
    console.log("Resposta da API recebida (Código " + responseCode + ")");

    // A API retorna a lista de voos dentro da propriedade 'response'
    const flights = content.response;

    if (!Array.isArray(flights)) {
      console.error("Erro: Propriedade 'response' não é uma lista", content);
      return createJsonResponse({status: 'error', message: 'Formato de resposta da API inválido'});
    }

    console.log("Voos encontrados: " + flights.length);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoursSheet = ss.getSheetByName('Horas');
    
    // Obter IDs existentes para evitar duplicados (Coluna D)
    const lastRow = hoursSheet.getLastRow();
    const existingIds = lastRow > 1 
      ? hoursSheet.getRange(2, 4, lastRow - 1, 1).getValues().flat().map(id => id.toString()) 
      : [];
    
    let addedCount = 0;
    flights.forEach(flight => {
      const flightIdStr = flight.Id.toString();
      
      if (!existingIds.includes(flightIdStr)) {
        // Converte minutos para horas decimais com 1 casa decimal
        const horasDec = (flight["Tempo total de voo"] / 60).toFixed(1);

        // Instrutor | Data | Horas | CavokId
        hoursSheet.appendRow([
          flight.Instrutor, 
          flight.Data, 
          horasDec, 
          flightIdStr
        ]);
        addedCount++;
        console.log("Adicionado voo ID: " + flightIdStr + " (" + horasDec + "h)");
      }
    });

    console.log("Sincronização concluída. " + addedCount + " novos registros.");
    return createJsonResponse({
      status: 'success', 
      message: addedCount + ' novos voos sincronizados.'
    });

  } catch (error) {
    console.error("Erro fatal no Sync: " + error.stack);
    return createJsonResponse({status: 'error', message: error.toString()});
  }
}

/**
 * Retorna lista de instrutores e total de horas processadas
 */
function handleGetData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const instructorsSheet = ss.getSheetByName('Instrutores');
    const hoursSheet = ss.getSheetByName('Horas');
    
    const instructors = instructorsSheet.getDataRange().getValues().slice(1);
    const hours = hoursSheet.getDataRange().getValues().slice(1);
    
    const instructorData = instructors.map(row => {
      const nome = row[0];
      const tipo = row[1];
      
      // Filtra e soma horas (case insensitive)
      const totalHoras = hours
        .filter(h => h[0] && h[0].toString().trim().toUpperCase() === nome.toString().trim().toUpperCase())
        .reduce((sum, h) => sum + Number(h[2] || 0), 0);
      
      return { 
        nome: nome, 
        tipo: tipo, 
        totalHoras: totalHoras.toFixed(2) 
      };
    });
    
    return createJsonResponse({ status: 'success', data: instructorData });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Cadastra um novo instrutor
 */
function handleAddInstructor(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Instrutores');
    sheet.appendRow([data.nome, data.tipo]);
    return createJsonResponse({status: 'success'});
  } catch (error) {
    return createJsonResponse({status: 'error', message: error.toString()});
  }
}

/**
 * Utilitário para formatar respostas JSON
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
