"use strict";

// ============================================================================
// CLASES CORE FÍSICAS
// ============================================================================
class Vector2D {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
}

class PhysicsBody {
    constructor(x, y, mass) {
        this.pos = new Vector2D(x, y);
        this.vel = new Vector2D(0, 0);
        this.acc = new Vector2D(0, 0);
        this.mass = mass;
    }
    applyForce(force) {
        let a = new Vector2D(force.x, force.y);
        a.mult(1 / this.mass);
        this.acc.add(a);
    }
    update(dt) {
        this.vel.add(new Vector2D(this.acc.x * dt, this.acc.y * dt));
        this.pos.add(new Vector2D(this.vel.x * dt, this.vel.y * dt));
        this.acc.x = 0; this.acc.y = 0;
    }
}

// ============================================================================
// MOTOR PRINCIPAL
// ============================================================================
class PhysicsEngine {
    constructor() {
        this.canvas = document.getElementById('simCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.w = this.canvas.width;
        this.h = this.canvas.height;
        
        this.module = 1; 
        this.isRunning = false;
        this.isSlowMo = false;
        this.lastTime = performance.now();
        
        // Efectos visuales de colisión
        this.particles = [];
        this.screenShake = 0;
        this.flashLife = 0;
        this.impactX = 0;
        
        // Estética
        this.boxPalette = ["#d97706", "#0284c7", "#16a34a", "#9333ea", "#dc2626"];
        
        // Estado Mod 1: Cajas y Desplazamiento
        this.boxes = [
            { id: 1, mass: 20, color: this.boxPalette[0] },
            { id: 2, mass: 30, color: this.boxPalette[1] }
        ];
        this.boxIdCounter = 3;
        this.pusher = new PhysicsBody(300, 350, 50); 
        this.distanceTravelled = 0; 

        // Estado Mod 2: Crash Lab
        this.car1 = new PhysicsBody(150, 370, 1000);
        this.car2 = new PhysicsBody(750, 370, 1200);
        this.hasCollided = false;
        this.collisionMetrics = null;
        
        this.params = {
            m1_f: 200, m1_u: 0.3,
            m2_m1: 1000, m2_v1: 20,
            m2_m2: 1200, m2_v2: -15,
            m2_e: 0.8, m2_u: 0.05
        };

        this.setModule(1);
        requestAnimationFrame((t) => this.mainLoop(t));
    }

    setModule(mod) {
        this.module = mod;
        this.isRunning = false;
        this.isSlowMo = false;
        
        document.getElementById('btn-tab-1').classList.toggle('active', mod === 1);
        document.getElementById('btn-tab-2').classList.toggle('active', mod === 2);
        
        this.resetSim();
        this.renderUI();
    }

    resetSim() {
        this.isRunning = false;
        this.hasCollided = false;
        this.collisionMetrics = null;
        
        // Reiniciar efectos visuales
        this.particles = [];
        this.screenShake = 0;
        this.flashLife = 0;
        
        if (this.module === 1) {
            this.distanceTravelled = 0;
            this.pusher.vel.x = 0;
            this.pusher.acc.x = 0;
        } else {
            this.car1.pos.x = 150;
            this.car1.vel.x = this.params.m2_v1;
            this.car1.acc.x = 0;
            
            this.car2.pos.x = 750;
            this.car2.vel.x = this.params.m2_v2;
            this.car2.acc.x = 0;
        }
        this.renderButtons();
        this.updateMath();
    }

    getTotalMass() { return this.boxes.reduce((sum, b) => sum + b.mass, 0); }

    // --- MANIPULACIÓN DOM DINÁMICA ---
    renderUI() {
        const baseContainer = document.getElementById('sliders-container');
        const dynContainer = document.getElementById('dynamic-module-controls');
        
        if (this.module === 1) {
            baseContainer.innerHTML = `
                <div class="control-group">
                    <div class="control-header"><span style="color:var(--primary)">Fuerza Aplicada</span><span class="val-badge" id="val_m1_f">${this.params.m1_f} N</span></div>
                    <input type="range" id="inp_m1_f" min="-600" max="600" step="10" value="${this.params.m1_f}">
                </div>
                <div class="control-group">
                    <div class="control-header"><span style="color:var(--text-dark)">Coef. Fricción (μ)</span><span class="val-badge" id="val_m1_u">${this.params.m1_u}</span></div>
                    <input type="range" id="inp_m1_u" min="0" max="0.8" step="0.05" value="${this.params.m1_u}">
                </div>
            `;
            this.renderBoxesUI();
        } else {
            dynContainer.innerHTML = ''; 
            baseContainer.innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="control-group">
                        <div class="control-header"><span style="color:var(--color-e)">Masa Roja</span><span class="val-badge" id="val_m2_m1">${this.params.m2_m1} kg</span></div>
                        <input type="range" id="inp_m2_m1" min="500" max="3000" step="100" value="${this.params.m2_m1}">
                    </div>
                    <div class="control-group">
                        <div class="control-header"><span style="color:var(--color-e)">Vel. Roja</span><span class="val-badge" id="val_m2_v1">${this.params.m2_v1} m/s</span></div>
                        <input type="range" id="inp_m2_v1" min="0" max="40" step="1" value="${this.params.m2_v1}">
                    </div>
                    <div class="control-group">
                        <div class="control-header"><span style="color:var(--color-p)">Masa Azul</span><span class="val-badge" id="val_m2_m2">${this.params.m2_m2} kg</span></div>
                        <input type="range" id="inp_m2_m2" min="500" max="3000" step="100" value="${this.params.m2_m2}">
                    </div>
                    <div class="control-group">
                        <div class="control-header"><span style="color:var(--color-p)">Vel. Azul</span><span class="val-badge" id="val_m2_v2">${this.params.m2_v2} m/s</span></div>
                        <input type="range" id="inp_m2_v2" min="-40" max="0" step="1" value="${this.params.m2_v2}">
                    </div>
                </div>
                <div class="control-group" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border);">
                    <div class="control-header"><span style="color:var(--primary)">Coef. Elasticidad (e)</span><span class="val-badge" id="val_m2_e">${this.params.m2_e}</span></div>
                    <input type="range" id="inp_m2_e" min="0" max="1" step="0.1" value="${this.params.m2_e}">
                </div>
            `;
        }

        const inputs = baseContainer.querySelectorAll('input[type="range"]');
        inputs.forEach(inp => {
            inp.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                let id = inp.id.replace('inp_', '');
                this.params[id] = val;
                
                let unit = id.includes('_v') ? ' m/s' : (id.includes('_m') ? ' kg' : (id.includes('_f') ? ' N' : ''));
                document.getElementById(`val_${id}`).innerText = `${val}${unit}`;
                
                if (this.module === 2 && !this.isRunning && !this.hasCollided) {
                    if (id === 'm2_v1') this.car1.vel.x = val;
                    if (id === 'm2_v2') this.car2.vel.x = val;
                }
                this.updateMath();
            });
        });
        this.renderButtons();
        this.updateMath();
    }

    renderBoxesUI() {
        if (this.module !== 1) return;
        const dyn = document.getElementById('dynamic-module-controls');
        
        let html = `
            <div style="font-size:0.75rem; font-weight:800; margin:10px 0 8px 0; color:var(--text-muted); text-transform:uppercase; display:flex; justify-content:space-between; align-items:center;">
                <span>Gestor de Cajas</span>
                <span style="background:var(--bg-app); padding:2px 8px; border-radius:4px; color:var(--text-dark);">Total: ${this.getTotalMass()} kg</span>
            </div>
        `;
        
        this.boxes.forEach(box => {
            html += `
                <div class="box-item">
                    <div class="box-info">
                        <span class="box-color-indicator" style="background:${box.color}"></span>
                        Caja #${box.id}
                    </div>
                    <div class="box-controls">
                        <input type="number" id="box_mass_${box.id}" value="${box.mass}" min="1" max="200" step="5">
                        <span style="font-size:0.75rem; font-weight:bold; color:var(--text-muted)">kg</span>
                        <button class="btn-remove" onclick="app.removeBox(${box.id})">✖</button>
                    </div>
                </div>
            `;
        });
        
        if (this.boxes.length < 5) {
            html += `<button class="btn-add" onclick="app.addBox()">+ Agregar Caja</button>`;
        }
        
        dyn.innerHTML = html;

        this.boxes.forEach(box => {
            document.getElementById(`box_mass_${box.id}`).addEventListener('change', (e) => {
                let val = parseFloat(e.target.value);
                if(isNaN(val) || val <= 0) val = 10;
                box.mass = val;
                this.renderBoxesUI();
                this.updateMath();
            });
        });
    }

    addBox() {
        if (this.boxes.length >= 5) return;
        this.boxes.push({ id: this.boxIdCounter++, mass: 30, color: this.boxPalette[this.boxes.length % this.boxPalette.length] });
        this.renderBoxesUI();
        this.updateMath();
    }

    removeBox(id) {
        if (this.boxes.length > 1) {
            this.boxes = this.boxes.filter(b => b.id !== id);
            this.renderBoxesUI();
            this.updateMath();
        }
    }

    renderButtons() {
        const cont = document.getElementById('action-buttons');
        if (this.module === 1) {
            cont.innerHTML = `
                <button class="btn btn-primary" onclick="app.togglePlay()">${this.isRunning ? "⏸ PAUSAR" : "▶ INICIAR"}</button>
                <button class="btn btn-secondary" onclick="app.resetSim()">↺ REINICIAR POSICIÓN</button>
            `;
        } else {
            cont.innerHTML = `
                <div class="btn-group">
                    <button class="btn btn-primary" style="flex:2;" onclick="app.togglePlay()">${this.isRunning ? "⏸ PAUSAR" : (this.hasCollided ? "▶ CONTINUAR" : "▶ INICIAR COLISIÓN")}</button>
                    <button class="btn btn-secondary" style="flex:1; padding:8px; font-size:0.7rem;" onclick="app.toggleSlowMo()">⏱ SLOW-MO<br>${this.isSlowMo ? "ON" : "OFF"}</button>
                </div>
                <button class="btn btn-secondary" onclick="app.resetSim()">↺ REINICIAR EXPERIMENTO</button>
            `;
        }
    }

    togglePlay() { this.isRunning = !this.isRunning; this.renderButtons(); }
    toggleSlowMo() { this.isSlowMo = !this.isSlowMo; this.renderButtons(); }

    updateHUD(htmlStr) { document.getElementById('hud-superior').innerHTML = htmlStr; }

    updateMath() {
        const mathDiv = document.getElementById('math-render');
        let tex = "";

        if (this.module === 1) {
            let F = this.params.m1_f; let m = this.getTotalMass(); let mu = this.params.m1_u;
            let fFmax = mu * m * 9.81;
            let fNet = Math.abs(F) <= fFmax && this.pusher.vel.x === 0 ? 0 : Math.abs(F) - fFmax;

            tex = `
                <div class="math-step"><span class="step-title">1. Fricción Dinámica del Sistema</span>
                $$ F_f = \\mu_k \\cdot (\\sum m) \\cdot g $$
                $$ F_f = ${mu} \\cdot ${m} \\cdot 9.81 = ${fFmax.toFixed(1)} \\text{ N} $$
                </div>
                <div class="math-step"><span class="step-title">2. Segunda Ley de Newton</span>
                $$ \\sum F = F_{app} - F_f = m \\cdot a $$
                $$ F_{neta} = |${F}| - ${fFmax.toFixed(1)} = ${Math.max(0, fNet).toFixed(1)} \\text{ N} $$
                ${fNet > 0 ? `$$ a = \\frac{${fNet.toFixed(1)}}{${m}} = ${(fNet/m).toFixed(2)} \\text{ m/s}^2 $$` : `$$ a = 0 \\text{ m/s}^2 \\text{ (Reposo)} $$`}
                </div>
            `;
        } else {
            let m1 = this.params.m2_m1; let v1 = this.params.m2_v1;
            let m2 = this.params.m2_m2; let v2 = this.params.m2_v2;
            let e = this.params.m2_e;
            let Pi = m1*v1 + m2*v2;
            let Ki = 0.5*m1*v1*v1 + 0.5*m2*v2*v2;

            tex = `
                <div class="math-step"><span class="step-title">1. Conservación de Momento</span>
                $$ P_{total} = m_1 v_1 + m_2 v_2 $$
                $$ P_{i} = (${m1})(${v1}) + (${m2})(${v2}) = ${Pi.toFixed(0)} \\text{ kg m/s} $$
                </div>
                <div class="math-step"><span class="step-title">2. Energía Cinética Inicial</span>
                $$ K_i = \\frac{1}{2}m_1 v_1^2 + \\frac{1}{2}m_2 v_2^2 = ${(Ki/1000).toFixed(1)} \\text{ kJ} $$
                </div>
                <div class="math-step"><span class="step-title">3. Ecuación de Restitución</span>
                $$ e = \\frac{v_{2f} - v_{1f}}{v_{1i} - v_{2i}} = ${e} $$
                </div>
            `;
        }
        mathDiv.innerHTML = tex;
        if (window.MathJax && window.MathJax.typesetPromise) MathJax.typesetPromise([mathDiv]);
    }

    // ========================================================================
    // RENDERIZADO VISUAL
    // ========================================================================
    clearCanvas() {
        this.ctx.fillStyle = "#ffffff"; this.ctx.fillRect(0, 0, this.w, this.h);
    }

    drawSueloScrolling(y, offset) {
        this.ctx.fillStyle = "#f8fafc"; this.ctx.fillRect(0, y, this.w, this.h - y);
        this.ctx.fillStyle = "#cbd5e1"; this.ctx.fillRect(0, y, this.w, 4);

        // Grid Móvil para ilusión de desplazamiento (Paralaje)
        this.ctx.strokeStyle = "#94a3b8";
        this.ctx.lineWidth = 2;
        let spacing = 80;
        let shift = (offset * 30) % spacing; 
        if (shift < 0) shift += spacing;
        
        this.ctx.beginPath();
        for(let i = -spacing; i < this.w + spacing; i += spacing) {
            let lx = i - shift;
            this.ctx.moveTo(lx, y);
            this.ctx.lineTo(lx - 20, y + 25);
        }
        this.ctx.stroke();
    }

    // --- RENDER MODULO 1 ---
    draw2DCharacter(x, y, F_app, dist) {
        let pDir = F_app >= 0 ? 1 : -1;
        let isPushing = Math.abs(F_app) > 0;
        let lean = isPushing ? (15 * pDir) : 0; 
        
        let walkT = dist * 0.5;
        let stride = 20;
        
        this.ctx.lineCap = "round"; this.ctx.lineJoin = "round";
        
        // Piernas
        this.ctx.lineWidth = 12;
        this.ctx.strokeStyle = "#64748b"; // Pierna atrás
        this.ctx.beginPath(); this.ctx.moveTo(x, y-40); this.ctx.lineTo(x - 5 + Math.sin(walkT+Math.PI)*stride, y - Math.max(0, Math.cos(walkT+Math.PI)*12)); this.ctx.stroke();
        
        this.ctx.strokeStyle = "#1e293b"; // Pierna frente
        this.ctx.beginPath(); this.ctx.moveTo(x, y-40); this.ctx.lineTo(x - 5 + Math.sin(walkT)*stride, y - Math.max(0, Math.cos(walkT)*12)); this.ctx.stroke();

        // Torso 
        this.ctx.lineWidth = 14; this.ctx.strokeStyle = "#f26522";
        this.ctx.beginPath(); this.ctx.moveTo(x, y-40); this.ctx.lineTo(x + lean, y-85); this.ctx.stroke();

        // Cabeza
        this.ctx.fillStyle = "#fbd38d";
        this.ctx.beginPath(); this.ctx.arc(x + lean + (isPushing?6*pDir:0), y-105, 14, 0, Math.PI*2); this.ctx.fill();

        // Brazo articulado empujando
        this.ctx.lineWidth = 10;
        this.ctx.strokeStyle = "#d95316"; 
        
        let shoulderX = x + lean;
        let shoulderY = y - 75;
        let handX = x + (isPushing ? 35 * pDir : 15 * pDir);
        let handY = y - 55;
        let elbowX = shoulderX + (handX - shoulderX) / 2;
        let elbowY = shoulderY + (isPushing ? 15 : 25);

        this.ctx.beginPath();
        this.ctx.moveTo(shoulderX, shoulderY);
        this.ctx.lineTo(elbowX, elbowY);
        this.ctx.lineTo(handX, handY);
        this.ctx.stroke();

        this.ctx.fillStyle = "#fbd38d";
        this.ctx.beginPath();
        this.ctx.arc(handX, handY, 6, 0, Math.PI*2);
        this.ctx.fill();
    }

    drawStackedBoxes(x, groundY) {
        let currentY = groundY;
        const boxWidth = 90; 
        
        for (let i = 0; i < this.boxes.length; i++) {
            let h = 35 + Math.min(60, (this.boxes[i].mass / 100) * 40); 
            currentY -= h;
            
            let wobble = (this.isRunning && this.pusher.vel.x !== 0) ? Math.sin(this.distanceTravelled * 0.5 + i) * (i*0.6) : 0;
            let boxX = x - boxWidth/2 + wobble;

            if (i > 0) {
                this.ctx.fillStyle = "rgba(0,0,0,0.15)";
                this.ctx.fillRect(boxX, currentY + h, boxWidth, 4);
            }

            this.ctx.fillStyle = this.boxes[i].color;
            this.ctx.beginPath(); 
            if(this.ctx.roundRect) this.ctx.roundRect(boxX, currentY, boxWidth, h, 4);
            else this.ctx.rect(boxX, currentY, boxWidth, h);
            this.ctx.fill();
            
            this.ctx.strokeStyle = "rgba(0,0,0,0.25)"; this.ctx.lineWidth = 3;
            if(this.ctx.roundRect) {
                this.ctx.beginPath(); this.ctx.roundRect(boxX + 5, currentY + 5, boxWidth - 10, h - 10, 2); this.ctx.stroke();
            } else this.ctx.strokeRect(boxX+5, currentY+5, boxWidth-10, h-10);
            
            this.ctx.fillStyle = "rgba(255,255,255,0.9)";
            this.ctx.font = "bold 14px monospace";
            this.ctx.textAlign = "center";
            this.ctx.fillText(`${this.boxes[i].mass}kg`, boxX + boxWidth/2, currentY + h/2 + 5);
        }
    }

    // --- RENDER MODULO 2 ---
    drawCar(x, y, mainColor, detailColor, wheelColor, mass) {
        this.ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
        this.ctx.beginPath(); this.ctx.ellipse(x, y, 60, 4, 0, 0, Math.PI * 2); this.ctx.fill();
        
        let scale = 1 + ((mass - 1000) / 2000) * 0.2;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);

        // Cuerpo principal
        this.ctx.fillStyle = mainColor;
        this.ctx.beginPath();
        if(this.ctx.roundRect) this.ctx.roundRect(-50, -35, 100, 24, 6);
        else this.ctx.rect(-50, -35, 100, 24);
        this.ctx.fill();
        
        // Cabina
        this.ctx.fillStyle = detailColor;
        this.ctx.beginPath();
        this.ctx.moveTo(-25, -35); this.ctx.lineTo(-15, -55);
        this.ctx.lineTo(15, -55); this.ctx.lineTo(25, -35);
        this.ctx.fill();

        const drawWheel = (wx) => {
            this.ctx.fillStyle = wheelColor;
            this.ctx.beginPath(); this.ctx.arc(wx, -10, 14, 0, Math.PI*2); this.ctx.fill();
            this.ctx.fillStyle = "#e2e8f0";
            this.ctx.beginPath(); this.ctx.arc(wx, -10, 5, 0, Math.PI*2); this.ctx.fill();
        };

        drawWheel(-30); drawWheel(30);
        this.ctx.restore();
    }

    // ========================================================================
    // LÓGICA DE SIMULACIÓN Y FÍSICA
    // ========================================================================
    simPush(dt) {
        let F = this.params.m1_f; let m = this.getTotalMass(); let mu = this.params.m1_u;
        let fFmax = mu * m * 9.81;
        let Fn = 0;

        if (this.isRunning) {
            if (Math.abs(this.pusher.vel.x) < 0.05) {
                if (Math.abs(F) > fFmax) Fn = F - (fFmax * Math.sign(F));
                else { Fn = 0; this.pusher.vel.x = 0; }
            } else {
                Fn = F - (fFmax * Math.sign(this.pusher.vel.x));
                if (F === 0 && Math.abs(this.pusher.vel.x) < Math.abs((Fn/m)*dt*1.5)) { 
                    this.pusher.vel.x = 0; Fn = 0; 
                }
            }
            this.pusher.mass = m;
            this.pusher.applyForce(new Vector2D(Fn, 0));
            this.pusher.update(dt);
            this.distanceTravelled += this.pusher.vel.x * dt;
        } else {
            Fn = (Math.abs(F) > fFmax) ? F - (fFmax * Math.sign(F)) : 0;
        }

        this.clearCanvas(); 
        this.drawSueloScrolling(360, this.distanceTravelled);
        
        let pDir = F >= 0 ? 1 : -1;
        let anchorX = this.w / 2 + 50; 
        
        this.ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
        this.ctx.beginPath(); this.ctx.ellipse(anchorX, 360, 55, 4, 0, 0, Math.PI * 2); this.ctx.fill();
        
        this.draw2DCharacter(anchorX - (pDir * 80), 360, F, this.distanceTravelled);
        this.drawStackedBoxes(anchorX, 360);

        const cardHTML = (l, v, c) => `
            <div class="hud-card">
                <div class="top-label">${l}</div>
                <div class="top-value" style="color:${c}">${v}</div>
            </div>`;
            
        this.updateHUD(`
            ${cardHTML("Fuerza Neta", Fn.toFixed(0) + " N", "var(--color-k)")}
            ${cardHTML("Velocidad", Math.abs(this.pusher.vel.x).toFixed(1) + " m/s", "var(--text-dark)")}
            ${cardHTML("Cajas", this.boxes.length, "var(--primary)")}
        `);
    }

    simCrashLab(dt) {
        let m1 = this.params.m2_m1; let m2 = this.params.m2_m2;
        let e = this.params.m2_e; 
        let visualSpeed = 15;
        let width1 = 100 * (1 + ((m1 - 1000) / 2000) * 0.2);
        let width2 = 100 * (1 + ((m2 - 1000) / 2000) * 0.2);
        let collisionDist = (width1/2) + (width2/2) + 10; 

        if (this.isRunning) {
            this.car1.pos.x += this.car1.vel.x * dt * visualSpeed;
            this.car2.pos.x += this.car2.vel.x * dt * visualSpeed;

            let currentDist = Math.abs(this.car2.pos.x - this.car1.pos.x);
            
            // DETECCIÓN DE COLISIÓN
            if (!this.hasCollided && currentDist <= collisionDist && this.car1.pos.x < this.car2.pos.x) {
                this.hasCollided = true;
                
                let overlap = collisionDist - currentDist;
                this.car1.pos.x -= overlap/2;
                this.car2.pos.x += overlap/2;

                // Generar Efectos de Impacto
                this.impactX = this.car1.pos.x + (collisionDist / 2);
                this.screenShake = 0.2; 
                this.flashLife = 0.15;  
                
                for (let i = 0; i < 25; i++) {
                    let ang = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 250 + 50;
                    this.particles.push({
                        x: this.impactX,
                        y: 380 - Math.random() * 30,
                        vx: Math.cos(ang) * speed,
                        vy: Math.sin(ang) * speed - 100, 
                        life: 1.0 + Math.random() * 0.5,
                        color: Math.random() > 0.6 ? '#f97316' : (Math.random() > 0.5 ? '#fbbf24' : '#cbd5e1'),
                        size: Math.random() * 3 + 2
                    });
                }

                let v1i = this.car1.vel.x; 
                let v2i = this.car2.vel.x;
                
                let Pi = m1*v1i + m2*v2i;
                let Ki = 0.5*m1*v1i*v1i + 0.5*m2*v2i*v2i;

                this.car1.vel.x = ((m1 - e*m2)*v1i + (1+e)*m2*v2i) / (m1+m2);
                this.car2.vel.x = ((m2 - e*m1)*v2i + (1+e)*m1*v1i) / (m1+m2);

                let Kf = 0.5*m1*Math.pow(this.car1.vel.x, 2) + 0.5*m2*Math.pow(this.car2.vel.x, 2);
                this.collisionMetrics = { Pi, Ki, Kf, loss: Ki - Kf };
                
                this.renderButtons(); 
            }

            // POST-COLISIÓN: Fricción Realista
            if (this.hasCollided) {
                let mu = this.params.m2_u; 
                let accelDecay = mu * 9.81 * dt; 

                const applyFriction = (car) => {
                    if (Math.abs(car.vel.x) > accelDecay) {
                        car.vel.x -= Math.sign(car.vel.x) * accelDecay;
                    } else {
                        car.vel.x = 0;
                    }
                };
                
                applyFriction(this.car1);
                applyFriction(this.car2);
            }

            // POST-COLISIÓN: Límites Físicos (Paredes)
            let maxCarHalfWidth = 60; 
            let wallWidth = 15;
            let wallOffset = 20;
            let leftBound = wallOffset + wallWidth + maxCarHalfWidth; 
            let rightBound = this.w - wallOffset - wallWidth - maxCarHalfWidth;
            let bounceMult = -0.3; // Rebote suave del 30%
            
            const applyBoundaries = (car) => {
                if (car.pos.x < leftBound) {
                    car.pos.x = leftBound;
                    car.vel.x *= bounceMult;
                } else if (car.pos.x > rightBound) {
                    car.pos.x = rightBound;
                    car.vel.x *= bounceMult;
                }
            };

            applyBoundaries(this.car1);
            applyBoundaries(this.car2);
        }

        // --- RENDERIZADO DEL ENTORNO ---
        this.clearCanvas(); 
        
        this.ctx.save(); 
        
        // Shake de cámara en colisión
        if (this.screenShake > 0) {
            this.screenShake -= dt;
            let intensity = (this.screenShake / 0.2) * 6; 
            this.ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
        }
        
        this.ctx.fillStyle = "#f8fafc"; this.ctx.fillRect(0, 380, this.w, this.h - 380);
        this.ctx.fillStyle = "#cbd5e1"; this.ctx.fillRect(0, 380, this.w, 4);

        // Indicadores visuales de Paredes Laterales
        this.ctx.fillStyle = "#94a3b8";
        if(this.ctx.roundRect) {
            this.ctx.beginPath(); this.ctx.roundRect(20, 340, 15, 60, 4); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.roundRect(this.w - 35, 340, 15, 60, 4); this.ctx.fill();
        } else {
            this.ctx.fillRect(20, 340, 15, 60);
            this.ctx.fillRect(this.w - 35, 340, 15, 60);
        }

        // Vehículos
        this.drawCar(this.car1.pos.x, 380, "#ef4444", "#991b1b", "#7f1d1d", m1);
        this.drawCar(this.car2.pos.x, 380, "#3b82f6", "#1e40af", "#1e3a8a", m2);

        // Render de Flash de impacto
        if (this.flashLife > 0) {
            this.flashLife -= dt;
            let alpha = Math.max(0, this.flashLife / 0.15);
            let grad = this.ctx.createRadialGradient(this.impactX, 360, 0, this.impactX, 360, 120);
            grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            grad.addColorStop(0.3, `rgba(253, 186, 116, ${alpha * 0.6})`);
            grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
            this.ctx.fillStyle = grad;
            this.ctx.beginPath(); this.ctx.arc(this.impactX, 360, 120, 0, Math.PI*2); this.ctx.fill();
        }

        // Render de Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 600 * dt; 
            p.life -= dt * 1.5;

            if (p.y > 380) {
                p.y = 380;
                p.vy *= -0.4;
                p.vx *= 0.8;
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;

        this.ctx.restore(); 

        // --- ACTUALIZACIÓN HUD ---
        const cardHTML = (l, v, c) => `
            <div class="hud-card">
                <div class="top-label">${l}</div>
                <div class="top-value" style="color:${c}; font-size: 1.1rem;">${v}</div>
            </div>`;
        
        let pAct = (m1*this.car1.vel.x + m2*this.car2.vel.x).toFixed(0);
        let KAct = (0.5*m1*Math.pow(this.car1.vel.x,2) + 0.5*m2*Math.pow(this.car2.vel.x,2));
        
        let statK = this.collisionMetrics 
            ? `Kf: ${(this.collisionMetrics.Kf/1000).toFixed(1)}kJ (Δ -${(this.collisionMetrics.loss/1000).toFixed(1)})`
            : `Ki: ${(KAct/1000).toFixed(1)}kJ`;

        this.updateHUD(`
            ${cardHTML("Velocidad Roja", this.car1.vel.x.toFixed(1) + " m/s", "var(--color-e)")}
            ${cardHTML("Momento (P)", pAct + " kg·m/s", "var(--text-dark)")}
            ${cardHTML("Energía (K)", statK, "var(--color-k)")}
            ${cardHTML("Velocidad Azul", this.car2.vel.x.toFixed(1) + " m/s", "var(--color-p)")}
        `);
    }

    mainLoop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        if (dt > 0.032) dt = 0.016; 
        if (this.isSlowMo) dt *= 0.15; 

        if (this.module === 1) this.simPush(dt);
        else this.simCrashLab(dt);

        requestAnimationFrame((t) => this.mainLoop(t));
    }
}

window.app = new PhysicsEngine();