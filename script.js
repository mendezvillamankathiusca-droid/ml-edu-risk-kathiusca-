/**
 * ML-EduRisk - Sistema de Prediccion de Riesgo Academico
 * JavaScript Completo
 * 
 * Modelo Supervisado: Random Forest (Accuracy: 91.14%)
 * Modelo No Supervisado: K-Means (Silhouette Score: 0.428)
 */

// =====================================================
// Global Variables and Data
// =====================================================

/** @type {Array} Array de objetos con datos de estudiantes */
let students = [];

/** @type {Chart|null} Instancia del grafico de riesgo */
let riskChart = null;

/** @type {Chart|null} Instancia del grafico de dispersion */
let scatterChart = null;

/** @type {Chart|null} Instancia del grafico de importancia */
let importanceChart = null;

/** @type {Chart|null} Instancia del grafico de clusters */
let clusterChart = null;

/** @type {Chart|null} Instancia del grafico de pastel de clusters */
let clusterPieChart = null;

/** @type {Chart|null} Instancia del grafico radar */
let radarChart = null;

/** @type {Array<string>} Nombres de estudiantes para datos sinteticos */
const studentNames = [
    "Ana Garcia", "Carlos Lopez", "Maria Rodriguez", "Juan Martinez",
    "Laura Sanchez", "Pedro Fernandez", "Sofia Gonzalez", "Diego Perez",
    "Carmen Torres", "Miguel Ruiz", "Elena Navarro", "Andres Moreno",
    "Lucia Jimenez", "Jose Alvarez", "Paula Castillo", "Fernando Ortiz",
    "Rosa Molina", "Antonio Serrano", "Isabel Dominguez", "Francisco Vargas",
    "Marta Herrera", "Roberto Diaz", "Cristina Moreno", "Manuel Flores",
    "Patricia Ortiz", "Javier Ramirez", "Beatriz Santos", "Daniel Munoz",
    "Raquel Marin", "Alberto Castillo", "Teresa Rubio", "Ricardo Guerrero",
    "Lorena Medina", "Adrian Torres", "Veronica Serrano", "Pablo Molina"
];

// =====================================================
// Data Generation Functions
// =====================================================

/**
 * Genera datos sinteticos de estudiantes basados en los resultados reales del modelo
 * @param {number} count - Numero de estudiantes a generar
 * @returns {Array} Array de objetos estudiante
 */
function generateStudents(count) {
    const data = [];
    
    for (let i = 0; i < count; i++) {
        // Generar valores que produzcan clusters que coincidan con resultados reales
        const clusterRand = Math.random();
        let g1, g2, failures, absences, age, studytime;
        
        if (clusterRand < 0.359) {
            // Cluster 0: Alto Rendimiento (35.9%)
            g1 = Math.round((Math.random() * 4 + 12) * 10) / 10;
            g2 = Math.round((Math.random() * 4 + 12.5) * 10) / 10;
            failures = Math.random() < 0.9 ? 0 : 1;
            absences = Math.round(Math.random() * 8 + 1);
            studytime = Math.floor(Math.random() * 2) + 3;
        } else if (clusterRand < 0.772) {
            // Cluster 1: Rendimiento Medio (41.3%)
            g1 = Math.round((Math.random() * 4 + 8.5) * 10) / 10;
            g2 = Math.round((Math.random() * 4 + 8) * 10) / 10;
            failures = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 2) + 1;
            absences = Math.round(Math.random() * 12 + 4);
            studytime = Math.floor(Math.random() * 3) + 1;
        } else {
            // Cluster 2: Alto Riesgo (22.8%)
            g1 = Math.round((Math.random() * 5 + 4) * 10) / 10;
            g2 = Math.round((Math.random() * 5 + 3.5) * 10) / 10;
            failures = Math.floor(Math.random() * 3) + 1;
            absences = Math.round(Math.random() * 25 + 10);
            studytime = Math.floor(Math.random() * 2) + 1;
        }
        
        age = Math.floor(Math.random() * 6) + 15;
        
        // Determinar nivel de riesgo basado en G2
        const riskLevel = g2 < 10 ? 'alto' : g2 < 13 ? 'medio' : 'bajo';
        
        // Asignar cluster
        const cluster = clusterRand < 0.359 ? 0 : clusterRand < 0.772 ? 1 : 2;
        
        data.push({
            id: i + 1,
            nombre: studentNames[i % studentNames.length],
            age: age,
            studytime: studytime,
            failures: failures,
            absences: absences,
            g1: Math.round(g1),
            g2: Math.round(g2),
            riskLevel: riskLevel,
            cluster: cluster
        });
    }
    
    return data;
}

/**
 * Calcula el score de riesgo basado en los pesos del modelo Random Forest
 * @param {number} age - Edad del estudiante
 * @param {number} studytime - Tiempo de estudio (1-4)
 * @param {number} failures - Numero de reprobaciones
 * @param {number} absences - Numero de ausencias
 * @param {number} g1 - Calificacion primer periodo
 * @param {number} g2 - Calificacion segundo periodo
 * @returns {number} Score de riesgo normalizado (0-1)
 */
function calculateRisk(age, studytime, failures, absences, g1, g2) {
    // Normalizar valores
    const normG2 = g2 / 20;
    const normG1 = g1 / 20;
    const normFailures = 1 - (failures / 4);
    const normAbsences = 1 - (absences / 93);
    const normAge = 1 - ((age - 15) / 7);
    const normStudytime = studytime / 4;
    
    // Aplicar pesos del modelo (importancia de variables real)
    const score = (normG2 * 0.287) + 
                  (normG1 * 0.243) + 
                  (normFailures * 0.189) + 
                  (normAbsences * 0.142) + 
                  (normAge * 0.085) + 
                  (normStudytime * 0.054);
    
    return Math.max(0, Math.min(1, score));
}

// =====================================================
// Chart Initialization Functions
// =====================================================

/**
 * Inicializa todos los graficos de la aplicacion
 */
function initCharts() {
    initRiskChart();
    initScatterChart();
    initImportanceChart();
    initClusterChart();
    initClusterPieChart();
    initRadarChart();
}

/**
 * Inicializa el grafico de distribucion de riesgo (Doughnut)
 */
function initRiskChart() {
    const ctx = document.getElementById('riskChart');
    if (!ctx) return;
    
    const riskCounts = {
        alto: students.filter(s => s.riskLevel === 'alto').length,
        medio: students.filter(s => s.riskLevel === 'medio').length,
        bajo: students.filter(s => s.riskLevel === 'bajo').length
    };
    
    // Destruir grafico anterior si existe
    if (riskChart) {
        riskChart.destroy();
    }
    
    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Riesgo Alto', 'Riesgo Medio', 'Riesgo Bajo'],
            datasets: [{
                data: [riskCounts.alto, riskCounts.medio, riskCounts.bajo],
                backgroundColor: [
                    'rgba(244, 63, 94, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(244, 63, 94, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 20,
                        font: {
                            size: 12,
                            family: "'DM Sans', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 37, 64, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            },
            cutout: '65%'
        }
    });
}

/**
 * Inicializa el grafico de dispersion G1 vs G2
 */
function initScatterChart() {
    const ctx = document.getElementById('scatterChart');
    if (!ctx) return;
    
    const data = students.map(s => ({
        x: s.g1,
        y: s.g2,
        r: Math.max(4, 15 - s.failures * 3),
        risk: s.riskLevel
    }));
    
    if (scatterChart) {
        scatterChart.destroy();
    }
    
    scatterChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [
                {
                    label: 'Riesgo Alto',
                    data: data.filter(d => d.risk === 'alto'),
                    backgroundColor: 'rgba(244, 63, 94, 0.6)',
                    borderColor: 'rgba(244, 63, 94, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Riesgo Medio',
                    data: data.filter(d => d.risk === 'medio'),
                    backgroundColor: 'rgba(245, 158, 11, 0.6)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Riesgo Bajo',
                    data: data.filter(d => d.risk === 'bajo'),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 37, 64, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return 'G1: ' + context.raw.x + ', G2: ' + context.raw.y;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'G1 (Primer Periodo)',
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    min: 0,
                    max: 20
                },
                y: {
                    title: {
                        display: true,
                        text: 'G2 (Segundo Periodo)',
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    min: 0,
                    max: 20
                }
            }
        }
    });
}

/**
 * Inicializa el grafico de importancia de variables
 */
function initImportanceChart() {
    const ctx = document.getElementById('importanceChart');
    if (!ctx) return;
    
    if (importanceChart) {
        importanceChart.destroy();
    }
    
    importanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['G2', 'G1', 'Failures', 'Absences', 'Age', 'Studytime'],
            datasets: [{
                label: 'Importancia (%)',
                data: [28.7, 24.3, 18.9, 14.2, 8.5, 5.4],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(34, 211, 238, 0.8)',
                    'rgba(244, 63, 94, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(34, 211, 238, 1)',
                    'rgba(244, 63, 94, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(99, 102, 241, 1)',
                    'rgba(168, 85, 247, 1)'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 37, 64, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return 'Importancia: ' + context.raw + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    max: 35
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    }
                }
            }
        }
    });
}

/**
 * Inicializa el grafico de visualizacion de clusters (Scatter con PCA simulado)
 */
function initClusterChart() {
    const ctx = document.getElementById('clusterChart');
    if (!ctx) return;
    
    // Simular reduccion PCA para visualizacion
    const pcaData = students.map(s => {
        const x = (s.g1 * 0.5 + s.g2 * 0.5) + (Math.random() - 0.5) * 3;
        const y = (s.failures * -2 + s.absences * 0.1) + (Math.random() - 0.5) * 4;
        return { x, y, cluster: s.cluster };
    });
    
    if (clusterChart) {
        clusterChart.destroy();
    }
    
    clusterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Cluster 0: Alto Rendimiento',
                    data: pcaData.filter(d => d.cluster === 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    pointRadius: 7,
                    pointHoverRadius: 10
                },
                {
                    label: 'Cluster 1: Rendimiento Medio',
                    data: pcaData.filter(d => d.cluster === 1),
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    pointRadius: 7,
                    pointHoverRadius: 10
                },
                {
                    label: 'Cluster 2: Alto Riesgo',
                    data: pcaData.filter(d => d.cluster === 2),
                    backgroundColor: 'rgba(244, 63, 94, 0.7)',
                    borderColor: 'rgba(244, 63, 94, 1)',
                    pointRadius: 7,
                    pointHoverRadius: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 37, 64, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Componente Principal 1 (Rendimiento)',
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Componente Principal 2 (Riesgo)',
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

/**
 * Inicializa el grafico de pastel de distribucion por cluster
 */
function initClusterPieChart() {
    const ctx = document.getElementById('clusterPieChart');
    if (!ctx) return;
    
    const clusterCounts = {
        c0: students.filter(s => s.cluster === 0).length,
        c1: students.filter(s => s.cluster === 1).length,
        c2: students.filter(s => s.cluster === 2).length
    };
    
    if (clusterPieChart) {
        clusterPieChart.destroy();
    }
    
    clusterPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Alto Rendimiento (35.9%)', 'Rendimiento Medio (41.3%)', 'Alto Riesgo (22.8%)'],
            datasets: [{
                data: [clusterCounts.c0, clusterCounts.c1, clusterCounts.c2],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(244, 63, 94, 0.8)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(244, 63, 94, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 15,
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 37, 64, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            }
        }
    });
}

/**
 * Inicializa el grafico radar de perfiles por cluster
 */
function initRadarChart() {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;
    
    const c0 = students.filter(s => s.cluster === 0);
    const c1 = students.filter(s => s.cluster === 1);
    const c2 = students.filter(s => s.cluster === 2);
    
    /**
     * Calcula el promedio de una propiedad en un array
     * @param {Array} arr - Array de objetos
     * @param {string} key - Propiedad a promediar
     * @returns {number} Promedio
     */
    const avg = function(arr, key) {
        if (!arr.length) return 0;
        return arr.reduce(function(sum, s) { return sum + s[key]; }, 0) / arr.length;
    };
    
    if (radarChart) {
        radarChart.destroy();
    }
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['G1', 'G2', 'Failures (inv)', 'Absences (inv)', 'Studytime', 'Age (inv)'],
            datasets: [
                {
                    label: 'Cluster 0',
                    data: [
                        avg(c0, 'g1'),
                        avg(c0, 'g2'),
                        20 - avg(c0, 'failures') * 5,
                        20 - avg(c0, 'absences') * 0.2,
                        avg(c0, 'studytime') * 5,
                        20 - avg(c0, 'age')
                    ],
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(16, 185, 129, 1)'
                },
                {
                    label: 'Cluster 1',
                    data: [
                        avg(c1, 'g1'),
                        avg(c1, 'g2'),
                        20 - avg(c1, 'failures') * 5,
                        20 - avg(c1, 'absences') * 0.2,
                        avg(c1, 'studytime') * 5,
                        20 - avg(c1, 'age')
                    ],
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(245, 158, 11, 1)'
                },
                {
                    label: 'Cluster 2',
                    data: [
                        avg(c2, 'g1'),
                        avg(c2, 'g2'),
                        20 - avg(c2, 'failures') * 5,
                        20 - avg(c2, 'absences') * 0.2,
                        avg(c2, 'studytime') * 5,
                        20 - avg(c2, 'age')
                    ],
                    backgroundColor: 'rgba(244, 63, 94, 0.2)',
                    borderColor: 'rgba(244, 63, 94, 1)',
                    pointBackgroundColor: 'rgba(244, 63, 94, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(244, 63, 94, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: {
                            family: "'DM Sans', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 37, 64, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(148, 163, 184, 0.2)'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.2)'
                    },
                    pointLabels: {
                        color: '#94a3b8',
                        font: {
                            size: 11,
                            family: "'DM Sans', sans-serif"
                        }
                    },
                    ticks: {
                        backdropColor: 'transparent',
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// =====================================================
// Table Rendering Functions
// =====================================================

/**
 * Renderiza la tabla de estudiantes
 * @param {Array} data - Array de estudiantes a mostrar
 */
function renderTable(data) {
    const tbody = document.getElementById('studentsTable');
    if (!tbody) return;
    
    tbody.innerHTML = data.slice(0, 25).map(function(s, index) {
        return '<tr class="table-row border-b border-slate-700/50" style="animation-delay: ' + (index * 20) + 'ms;">' +
            '<td class="py-3 px-4 font-mono text-sm text-slate-400">' + s.id + '</td>' +
            '<td class="py-3 px-4">' + s.age + '</td>' +
            '<td class="py-3 px-4">' + s.studytime + '</td>' +
            '<td class="py-3 px-4">' +
                '<span class="' + (s.failures === 0 ? 'text-emerald-400' : s.failures <= 1 ? 'text-amber-400' : 'text-rose-400') + '">' +
                    s.failures +
                '</span>' +
            '</td>' +
            '<td class="py-3 px-4">' +
                '<span class="' + (s.absences <= 5 ? 'text-emerald-400' : s.absences <= 15 ? 'text-amber-400' : 'text-rose-400') + '">' +
                    s.absences +
                '</span>' +
            '</td>' +
            '<td class="py-3 px-4">' +
                '<span class="' + (s.g1 >= 14 ? 'text-emerald-400' : s.g1 >= 10 ? 'text-amber-400' : 'text-rose-400') + '">' +
                    s.g1 +
                '</span>' +
            '</td>' +
            '<td class="py-3 px-4">' +
                '<span class="' + (s.g2 >= 14 ? 'text-emerald-400' : s.g2 >= 10 ? 'text-amber-400' : 'text-rose-400') + '">' +
                    s.g2 +
                '</span>' +
            '</td>' +
            '<td class="py-3 px-4">' +
                '<span class="badge badge-' + s.riskLevel + '">' +
                    (s.riskLevel === 'alto' ? 'Alto' : s.riskLevel === 'medio' ? 'Medio' : 'Bajo') +
                '</span>' +
            '</td>' +
            '<td class="py-3 px-4">' +
                '<span class="inline-flex items-center gap-2">' +
                    '<span class="w-3 h-3 rounded-full ' + (s.cluster === 0 ? 'bg-emerald-500' : s.cluster === 1 ? 'bg-amber-500' : 'bg-rose-500') + '" aria-hidden="true"></span>' +
                    s.cluster +
                '</span>' +
            '</td>' +
        '</tr>';
    }).join('');
}

/**
 * Filtra los estudiantes mostrados en la tabla
 */
function filterStudents() {
    const searchInput = document.getElementById('searchInput');
    const riskFilter = document.getElementById('riskFilter');
    
    if (!searchInput || !riskFilter) return;
    
    const search = searchInput.value.toLowerCase();
    const riskValue = riskFilter.value;
    
    let filtered = students;
    
    if (search) {
        filtered = filtered.filter(function(s) { 
            return s.nombre.toLowerCase().indexOf(search) !== -1 || 
                   String(s.id).indexOf(search) !== -1;
        });
    }
    
    if (riskValue) {
        filtered = filtered.filter(function(s) { return s.riskLevel === riskValue; });
    }
    
    renderTable(filtered);
}

// =====================================================
// Prediction Functions
// =====================================================

/**
 * Ejecuta la prediccion de riesgo para un estudiante
 * @param {Event} event - Evento del formulario
 */
function runPrediction(event) {
    event.preventDefault();
    
    // Obtener valores del formulario
    const age = parseFloat(document.getElementById('age').value);
    const studytime = parseFloat(document.getElementById('studytime').value);
    const failures = parseFloat(document.getElementById('failures').value);
    const absences = parseFloat(document.getElementById('absences').value);
    const g1 = parseFloat(document.getElementById('g1').value);
    const g2 = parseFloat(document.getElementById('g2').value);
    
    // Calcular score de riesgo
    const score = calculateRisk(age, studytime, failures, absences, g1, g2);
    
    // Determinar nivel de riesgo
    const riskLevel = score < 0.5 ? 'alto' : score < 0.7 ? 'medio' : 'bajo';
    const riskProbability = ((1 - score) * 100).toFixed(1);
    
    // Mostrar resultados
    const resultDiv = document.getElementById('predictionResult');
    const contentDiv = document.getElementById('resultContent');
    
    if (!resultDiv || !contentDiv) return;
    
    resultDiv.style.display = 'block';
    
    // Configuracion visual por nivel de riesgo
    const riskConfig = {
        alto: { 
            bg: 'rgba(244, 63, 94, 0.1)', 
            border: 'rgba(244, 63, 94, 0.4)', 
            text: 'text-rose-400', 
            label: 'Alto Riesgo' 
        },
        medio: { 
            bg: 'rgba(245, 158, 11, 0.1)', 
            border: 'rgba(245, 158, 11, 0.4)', 
            text: 'text-amber-400', 
            label: 'Riesgo Medio' 
        },
        bajo: { 
            bg: 'rgba(16, 185, 129, 0.1)', 
            border: 'rgba(16, 185, 129, 0.4)', 
            text: 'text-emerald-400', 
            label: 'Bajo Riesgo' 
        }
    };
    
    const risk = riskConfig[riskLevel];
    
    // Renderizar resultados
    contentDiv.innerHTML = 
        '<div class="rounded-xl p-6 mb-6" style="background: ' + risk.bg + '; border: 2px solid ' + risk.border + '">' +
            '<div class="flex items-center justify-between mb-4">' +
                '<h4 class="text-lg font-semibold">Prediccion del Modelo</h4>' +
                '<span class="badge badge-' + riskLevel + ' text-base px-4 py-1">' + risk.label + '</span>' +
            '</div>' +
            '<div class="mb-4">' +
                '<div class="flex justify-between text-sm mb-2">' +
                    '<span class="text-slate-400">Probabilidad de Riesgo Academico</span>' +
                    '<span class="' + risk.text + ' font-bold text-lg">' + riskProbability + '%</span>' +
                '</div>' +
                '<div class="progress-bar" style="height: 14px;">' +
                    '<div class="progress-fill" style="width: ' + riskProbability + '%; background: linear-gradient(90deg, ' + risk.border + ', ' + risk.bg + ')"></div>' +
                '</div>' +
            '</div>' +
            '<p class="text-xs text-slate-500">Score calculado: ' + score.toFixed(4) + '</p>' +
        '</div>' +
        
        '<h4 class="font-semibold mb-4">Analisis de Variables</h4>' +
        '<div class="space-y-3 mb-6">' +
            generateVariableAnalysis('G2 (Segundo Periodo)', g2, 14, 28.7, 20, false) +
            generateVariableAnalysis('G1 (Primer Periodo)', g1, 12, 24.3, 20, false) +
            generateVariableAnalysis('Failures (Reprobaciones)', failures, 0, 18.9, 4, true) +
            generateVariableAnalysis('Absences (Ausencias)', absences, 10, 14.2, 93, true) +
            generateVariableAnalysis('Age (Edad)', age, 16, 8.5, 22, false) +
            generateVariableAnalysis('Studytime', studytime, 3, 5.4, 4, false) +
        '</div>' +
        
        '<div class="bg-slate-800/50 rounded-xl p-5">' +
            '<h4 class="font-semibold mb-3">Recomendaciones</h4>' +
            '<ul class="text-sm text-slate-400 space-y-2">' +
                (riskLevel === 'alto' ? 
                    '<li>Intervencion pedagogica inmediata requerida</li>' +
                    '<li>Asignar tutor de apoyo academico personalizado</li>' +
                    '<li>Revisar causas de ausencias frecuentes</li>' +
                    '<li>Comunicacion urgente con padres/madres</li>' +
                    '<li>Considerar evaluacion psicopedagogica</li>'
                : riskLevel === 'medio' ? 
                    '<li>Implementar monitoreo quincenal de progreso</li>' +
                    '<li>Actividades de refuerzo en areas debiles</li>' +
                    '<li>Fomentar mayor tiempo de estudio en casa</li>' +
                    '<li>Seguimiento de asistencia y participacion</li>'
                : 
                    '<li>Mantener estrategias actuales de estudio</li>' +
                    '<li>Considerar para programas de enrichment</li>' +
                    '<li>Potencial como tutor de pares</li>' +
                    '<li>Continuar monitoreo preventivo</li>'
                ) +
            '</ul>' +
        '</div>';
    
    // Scroll al resultado
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Genera el HTML para el analisis de una variable individual
 * @param {string} name - Nombre de la variable
 * @param {number} value - Valor de la variable
 * @param {number} threshold - Umbral de referencia
 * @param {number} importance - Importancia de la variable (%)
 * @param {number} maxVal - Valor maximo posible
 * @param {boolean} invert - Si el valor debe invertirse para evaluar
 * @returns {string} HTML del analisis
 */
function generateVariableAnalysis(name, value, threshold, importance, maxVal, invert) {
    const normVal = value / maxVal;
    const thresholdNorm = threshold / maxVal;
    let status;
    
    if (invert) {
        status = normVal <= thresholdNorm ? 'success' : normVal <= thresholdNorm * 1.5 ? 'warning' : 'danger';
    } else {
        status = normVal >= thresholdNorm ? 'success' : normVal >= thresholdNorm * 0.7 ? 'warning' : 'danger';
    }
    
    const colors = {
        success: 'text-emerald-400',
        warning: 'text-amber-400',
        danger: 'text-rose-400'
    };
    
    return '<div class="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">' +
        '<div>' +
            '<span class="text-sm font-medium">' + name + '</span>' +
            '<p class="text-xs text-slate-500">Importancia: ' + importance + '%</p>' +
        '</div>' +
        '<span class="' + colors[status] + ' font-bold">' + value + '</span>' +
    '</div>';
}

// =====================================================
// Navigation Functions
// =====================================================

/**
 * Cambia entre pestañas de navegacion
 * @param {string} tabId - ID de la pestana a mostrar
 */
function switchTab(tabId) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(function(tab) {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones de navegacion
    document.querySelectorAll('.nav-item').forEach(function(nav) {
        nav.classList.remove('active');
        nav.removeAttribute('aria-current');
    });
    
    // Mostrar pestana seleccionada
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Activar boton de navegacion
    const targetNav = document.querySelector('[data-tab="' + tabId + '"]');
    if (targetNav) {
        targetNav.classList.add('active');
        targetNav.setAttribute('aria-current', 'page');
    }
    
    // Reinicializar graficos segun la pestana
    setTimeout(function() {
        if (tabId === 'dashboard') {
            initRiskChart();
            initScatterChart();
            initImportanceChart();
        } else if (tabId === 'clustering') {
            initClusterChart();
            initClusterPieChart();
            initRadarChart();
        }
    }, 100);
}

// =====================================================
// Event Listeners and Initialization
// =====================================================

/**
 * Inicializa la aplicacion cuando el DOM esta listo
 */
function initApp() {
    // Generar datos de estudiantes
    students = generateStudents(395);
    
    // Renderizar tabla inicial
    renderTable(students);
    
    // Inicializar graficos
    initCharts();
    
    // Configurar formulario de prediccion
    const predictionForm = document.getElementById('predictionForm');
    if (predictionForm) {
        predictionForm.addEventListener('submit', runPrediction);
    }
    
    // Configurar navegacion con teclado
    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
    
    console.log('ML-EduRisk v2.0 initialized successfully');
    console.log('Dataset: 395 students');
    console.log('Random Forest Accuracy: 91.14%');
    console.log('K-Means Silhouette Score: 0.428');
}

// Ejecutar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', initApp);
