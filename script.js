/**
 * ==============================================================================
 * A LENDA DOS SEIS LADOS - RPG TÁTICO 2D
 * Desenvolvido com HTML5 Canvas, CSS3 e JavaScript Puro (Sem bibliotecas externas)
 * ==============================================================================
 */

// Evita menu de contexto padrão do botão direito em toda a aplicação
window.addEventListener('contextmenu', (e) => e.preventDefault());

/* ==========================================================================
   1. GERENCIADOR DE ÁUDIO SINTETIZADO (WEB AUDIO API)
   Gera efeitos sonoros realistas e retrô de RPG sem depender de arquivos externos
   ========================================================================== */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initialized = true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, decay = true) {
    if (this.isMuted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      if (decay) {
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      }
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // AudioContext fallback
    }
  }

  playDiceRoll() {
    if (this.isMuted) return;
    this.init();
    // Efeito de dados rolando: vários estalos seguidos de um baque
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        const freq = 300 + Math.random() * 400;
        this.playTone(freq, 'triangle', 0.05, 0.12);
      }, i * 65);
    }
    setTimeout(() => {
      this.playTone(180, 'sine', 0.2, 0.2); // Batida final
    }, 480);
  }

  playSwordSlash() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playMagicSpell() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playShieldBlock() {
    this.playTone(140, 'square', 0.12, 0.15);
  }

  playHeal() {
    if (this.isMuted) return;
    const notes = [330, 440, 550, 660];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sine', 0.15, 0.12), idx * 70);
    });
  }

  playChestOpen() {
    if (this.isMuted) return;
    const notes = [261, 329, 392, 523];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.2, 0.15), idx * 80);
    });
  }

  playLevelUp() {
    if (this.isMuted) return;
    const notes = [261, 329, 392, 523, 659, 783];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'square', 0.25, 0.15), idx * 90);
    });
  }

  playEnemyHurt() {
    this.playTone(110, 'sawtooth', 0.12, 0.18);
  }

  playDefeat() {
    if (this.isMuted) return;
    const notes = [300, 260, 220, 180, 140];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.2), idx * 120);
    });
  }

  playVictory() {
    if (this.isMuted) return;
    const notes = [392, 523, 659, 784, 1046];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.35, 0.2), idx * 100);
    });
  }

  playClick() {
    this.playTone(400, 'sine', 0.04, 0.08);
  }
}

const sounds = new SoundManager();

/* ==========================================================================
   2. BANCO DE DADOS DO JOGO (CARTAS, ITENS, INIMIGOS)
   ========================================================================== */

const DATABASE = {
  // Cartas de Habilidades
  cards: [
    {
      id: 'corte_rapido',
      name: 'Golpe Rápido',
      type: 'attack',
      typeName: 'Ataque',
      icon: '🗡️',
      cost: 0,
      power: 14,
      desc: 'Um golpe ágil com a lâmina. Não consome mana.',
      statDisplay: '⚔️ Poder: 14'
    },
    {
      id: 'lamina_fogo',
      name: 'Lâmina Flamejante',
      type: 'attack',
      typeName: 'Ataque',
      icon: '🔥',
      cost: 12,
      power: 26,
      desc: 'Envolve a espada em chamas. Dano massivo multiplicado pelo D6.',
      statDisplay: '⚔️ Poder: 26 (Fogo)'
    },
    {
      id: 'golpe_pesado',
      name: 'Golpe Esmagador',
      type: 'attack',
      typeName: 'Ataque',
      icon: '🪓',
      cost: 18,
      power: 36,
      desc: 'Ataque brutal com força total. Ignora 40% da defesa do alvo.',
      statDisplay: '⚔️ Poder: 36 (Brutal)'
    },
    {
      id: 'muralha_ferro',
      name: 'Postura Defensiva',
      type: 'defense',
      typeName: 'Defesa',
      icon: '🛡️',
      cost: 8,
      power: 18,
      desc: 'Ergue o escudo e firma os pés. Concede bônus de armadura temporário.',
      statDisplay: '🛡️ Escudo: +18'
    },
    {
      id: 'raio_arcano',
      name: 'Raio Arcano',
      type: 'special',
      typeName: 'Especial',
      icon: '⚡',
      cost: 20,
      power: 30,
      desc: 'Dispara um relâmpago mágico. Atordoa o inimigo se o D6 for 4 ou mais!',
      statDisplay: '⚡ Poder: 30 (Raio)'
    },
    {
      id: 'cura_sagrada',
      name: 'Cura Sagrada',
      type: 'recovery',
      typeName: 'Recuperação',
      icon: '💖',
      cost: 15,
      power: 35,
      desc: 'Canaliza luz divina. Restaura vida proporcional ao resultado do D6.',
      statDisplay: '💖 Cura: +35 HP'
    },
    {
      id: 'meditacao',
      name: 'Meditação Arcana',
      type: 'recovery',
      typeName: 'Recuperação',
      icon: '🧘‍♂️',
      cost: 0,
      power: 25,
      desc: 'Concentração profunda que restaura 25 pontos de Mana imediatamente.',
      statDisplay: '🔮 Mana: +25 MP'
    }
  ],

  // Itens do Inventário
  items: {
    // Armas
    espada_ferro: {
      id: 'espada_ferro',
      name: 'Espada de Ferro',
      type: 'equipment',
      slot: 'weapon',
      icon: '🗡️',
      attack: 8,
      defense: 0,
      desc: 'Uma espada padrão confiável de soldados imperiais.',
      statsText: '+8 Ataque'
    },
    lamina_elfica: {
      id: 'lamina_elfica',
      name: 'Lâmina Élfica',
      type: 'equipment',
      slot: 'weapon',
      icon: '✨',
      attack: 16,
      defense: 1,
      desc: 'Forjada em prata lunar pelos elfos das florestas antigas.',
      statsText: '+16 Ataque, +1 Defesa'
    },
    machado_guerra: {
      id: 'machado_guerra',
      name: 'Machado de Batalha',
      type: 'equipment',
      slot: 'weapon',
      icon: '🪓',
      attack: 24,
      defense: 0,
      desc: 'Pesado e devastador, racha escudos ao meio.',
      statsText: '+24 Ataque'
    },
    espada_sagrada: {
      id: 'espada_sagrada',
      name: 'Espada da Alvorada',
      type: 'equipment',
      slot: 'weapon',
      icon: '⚔️',
      attack: 35,
      defense: 4,
      desc: 'Relíquia sagrada banhada na luz do sol de Aethelgard.',
      statsText: '+35 Ataque, +4 Defesa'
    },

    // Escudos
    broquel_carvalho: {
      id: 'broquel_carvalho',
      name: 'Broquel de Carvalho',
      type: 'equipment',
      slot: 'shield',
      icon: '🛡️',
      attack: 0,
      defense: 3,
      desc: 'Escudo leve de madeira reforçado com ferro.',
      statsText: '+3 Defesa'
    },
    escudo_aco: {
      id: 'escudo_aco',
      name: 'Escudo de Aço Guardião',
      type: 'equipment',
      slot: 'shield',
      icon: '🛡️',
      attack: 0,
      defense: 8,
      desc: 'Escudo pesado com o brasão do reino.',
      statsText: '+8 Defesa'
    },
    escudo_dragao: {
      id: 'escudo_dragao',
      name: 'Escudo Escama de Dragão',
      type: 'equipment',
      slot: 'shield',
      icon: '🐉',
      attack: 3,
      defense: 14,
      desc: 'Esculpido com escamas vermelhas imunes ao fogo.',
      statsText: '+14 Defesa, +3 Ataque'
    },

    // Armaduras
    tunica_couro: {
      id: 'tunica_couro',
      name: 'Túnica de Couro',
      type: 'equipment',
      slot: 'armor',
      icon: '🥋',
      attack: 0,
      defense: 4,
      desc: 'Roupa de couro curtido flexível para viajantes.',
      statsText: '+4 Defesa'
    },
    cota_malha: {
      id: 'cota_malha',
      name: 'Cota de Malha de Aço',
      type: 'equipment',
      slot: 'armor',
      icon: '🦺',
      attack: 0,
      defense: 9,
      desc: 'Anéis de aço entrelaçados para proteção contra cortes.',
      statsText: '+9 Defesa'
    },
    armadura_placas: {
      id: 'armadura_placas',
      name: 'Armadura de Placas Nobre',
      type: 'equipment',
      slot: 'armor',
      icon: '🛡️',
      attack: 0,
      defense: 16,
      desc: 'Armadura completa dos campeões reais.',
      statsText: '+16 Defesa'
    },

    // Acessórios
    pingente_sorte: {
      id: 'pingente_sorte',
      name: 'Pingente da Sorte',
      type: 'equipment',
      slot: 'accessory',
      icon: '📿',
      attack: 2,
      defense: 2,
      desc: 'Abençoado por clérigos dos seis lados sagrados.',
      statsText: '+2 Ataque, +2 Defesa'
    },
    anel_rubi: {
      id: 'anel_rubi',
      name: 'Anel do Rubi Flamejante',
      type: 'equipment',
      slot: 'accessory',
      icon: '💍',
      attack: 7,
      defense: 1,
      desc: 'Emite um calor constante que potencializa os golpes.',
      statsText: '+7 Ataque, +1 Defesa'
    },

    // Consumíveis
    pocao_vida: {
      id: 'pocao_vida',
      name: 'Poção de Vida',
      type: 'consumable',
      icon: '🧪',
      desc: 'Frasco de essência de ervas vermelhas. Restaura 50 pontos de Vida.',
      statsText: 'Restaura +50 HP',
      effect: (player) => {
        const healed = player.heal(50);
        return `Você bebeu uma Poção de Vida e recuperou ${healed} HP!`;
      }
    },
    pocao_mana: {
      id: 'pocao_mana',
      name: 'Poção de Mana',
      type: 'consumable',
      icon: '🧪',
      desc: 'Frasco brilhante de pó de cristal azul. Restaura 40 pontos de Mana.',
      statsText: 'Restaura +40 MP',
      effect: (player) => {
        const restored = player.restoreMP(40);
        return `Você bebeu uma Poção de Mana e recuperou ${restored} MP!`;
      }
    },
    elixir_vigor: {
      id: 'elixir_vigor',
      name: 'Elixir dos Heróis',
      type: 'consumable',
      icon: '🏺',
      desc: 'Bebida lendária. Restaura 100 de Vida e 50 de Mana instantaneamente.',
      statsText: 'Restaura +100 HP e +50 MP',
      effect: (player) => {
        player.heal(100);
        player.restoreMP(50);
        return `O Elixir dos Heróis revigorou seu corpo e mente com poder total!`;
      }
    },

    // Itens Especiais
    chave_dourada: {
      id: 'chave_dourada',
      name: 'Chave Dourada Antiga',
      type: 'special',
      icon: '🗝️',
      desc: 'Uma chave de ouro puro ornamentada. Abre portas e arcas secretas.',
      statsText: 'Item de Missão'
    },
    cristal_sagrado: {
      id: 'cristal_sagrado',
      name: 'Cristal Sagrado de Aethelgard',
      type: 'special',
      icon: '💎',
      desc: 'Uma jóia mística que vibra em ressonância com os dados divinos.',
      statsText: 'Relíquia Misteriosa'
    }
  },

  // Inimigos do Bestiário
  bestiary: {
    goblin: {
      name: 'Goblin Ladino',
      icon: '👺',
      color: '#4caf50',
      maxHp: 45,
      attack: 9,
      defense: 2,
      xp: 35,
      gold: 18,
      speed: 60,
      aggroRadius: 180,
      drops: ['pocao_vida', 'lamina_elfica']
    },
    esqueleto: {
      name: 'Esqueleto Guerreiro',
      icon: '💀',
      color: '#e0e0e0',
      maxHp: 75,
      attack: 14,
      defense: 5,
      xp: 65,
      gold: 32,
      speed: 50,
      aggroRadius: 200,
      drops: ['pocao_mana', 'escudo_aco']
    },
    orc: {
      name: 'Orc Brutamontes',
      icon: '👹',
      color: '#c0392b',
      maxHp: 120,
      attack: 20,
      defense: 8,
      xp: 120,
      gold: 60,
      speed: 45,
      aggroRadius: 220,
      drops: ['machado_guerra', 'elixir_vigor']
    },
    necromante: {
      name: 'Necromante Sombrio',
      icon: '🧙‍♂️',
      color: '#9b59b6',
      maxHp: 200,
      attack: 26,
      defense: 10,
      xp: 250,
      gold: 150,
      speed: 40,
      aggroRadius: 240,
      isBoss: true,
      drops: ['espada_sagrada', 'escudo_dragao', 'cristal_sagrado']
    }
  }
};

/* ==========================================================================
   3. SISTEMA DE DADO D6 VIRTUAL
   Regras: 1 a 6 com multiplicadores de desempenho registrados no combate
   ========================================================================== */
class DiceManager {
  constructor(game) {
    this.game = game;
    this.currentValue = null;
    this.isRolling = false;
    this.diceCube = document.getElementById('d6-cube');
    this.valDisplay = document.getElementById('dice-val-display');
    this.multiplierTag = document.getElementById('dice-multiplier-tag');
    this.checkDice = document.getElementById('check-dice');
  }

  // Tabela de multiplicadores de acordo com a face
  getMultiplier(val) {
    switch (val) {
      case 1: return { mult: 0.7, label: 'Raspão (x0.7)' };
      case 2: return { mult: 0.9, label: 'Comum (x0.9)' };
      case 3: return { mult: 1.0, label: 'Preciso (x1.0)' };
      case 4: return { mult: 1.25, label: 'Forte (x1.25)' };
      case 5: return { mult: 1.5, label: 'Devastador (x1.5)' };
      case 6: return { mult: 2.0, label: 'CRÍTICO! (x2.0)' };
      default: return { mult: 1.0, label: '(x1.0)' };
    }
  }

  roll(callback) {
    if (this.isRolling) return;
    this.isRolling = true;
    sounds.playDiceRoll();

    // Inicia animação CSS
    this.diceCube.classList.add('rolling');
    this.valDisplay.textContent = '...';
    this.multiplierTag.textContent = '(Rolando...)';
    this.multiplierTag.style.color = '#f1c40f';

    // Rola durante 650ms
    setTimeout(() => {
      this.diceCube.classList.remove('rolling');
      const result = Math.floor(Math.random() * 6) + 1;
      this.currentValue = result;
      this.isRolling = false;

      // Orienta o cubo 3D para a face sorteada
      this.setDiceTransform(result);

      const meta = this.getMultiplier(result);
      this.valDisplay.textContent = result;
      this.multiplierTag.textContent = `(${meta.label})`;
      this.multiplierTag.style.color = result === 6 ? '#ffd700' : (result === 1 ? '#e74c3c' : '#2ecc71');

      // Atualiza checklist
      this.checkDice.classList.add('ready');
      this.checkDice.querySelector('.check-icon').textContent = '✅';

      // Log no histórico
      const critText = result === 6 ? ' ⭐ CRÍTICO SUPREMO!' : (result === 1 ? ' ⚠️ Raspão!' : '');
      this.game.logMessage(`🎲 Você rolou o dado D6: <b>[${result}]</b>! ${meta.label}${critText}`, 'log-dice');

      this.game.updateAttackStatus();

      if (callback) callback(result);
    }, 650);
  }

  setDiceTransform(val) {
    // Rotações para exibir a face correspondente
    const transforms = {
      1: 'rotateY(0deg) rotateX(0deg)',
      2: 'rotateY(-90deg) rotateX(0deg)',
      3: 'rotateY(-180deg) rotateX(0deg)',
      4: 'rotateY(90deg) rotateX(0deg)',
      5: 'rotateX(-90deg) rotateY(0deg)',
      6: 'rotateX(90deg) rotateY(0deg)'
    };
    this.diceCube.style.transform = transforms[val] || 'rotateX(-20deg) rotateY(30deg)';
  }

  resetRoll() {
    this.currentValue = null;
    this.valDisplay.textContent = '-';
    this.multiplierTag.textContent = '(x1.0)';
    this.multiplierTag.style.color = '#2ecc71';
    this.checkDice.classList.remove('ready');
    this.checkDice.querySelector('.check-icon').textContent = '⚪';
    this.diceCube.style.transform = 'rotateX(-20deg) rotateY(30deg)';
    this.game.updateAttackStatus();
  }
}

/* ==========================================================================
   4. SISTEMA DO JOGADOR (STATUS, MOVIMENTO, EQUIPAMENTOS, CARTAS)
   ========================================================================== */
class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 36;
    this.height = 42;
    this.speed = 175; // px por segundo

    this.direction = 'down'; // 'down', 'up', 'left', 'right'
    this.isMoving = false;
    this.walkAnimTimer = 0;
    this.walkFrame = 0;

    // Ficha de Atributos
    this.name = 'Valerius';
    this.level = 1;
    this.xp = 0;
    this.maxXp = 100;
    this.hp = 100;
    this.maxHp = 100;
    this.mp = 50;
    this.maxMp = 50;
    this.baseAttack = 10;
    this.baseDefense = 4;
    this.gold = 50;
    this.enemiesDefeated = 0;

    // Equipamentos equipados atualmente
    this.equipment = {
      weapon: DATABASE.items.espada_ferro,
      shield: DATABASE.items.broquel_carvalho,
      armor: DATABASE.items.tunica_couro,
      accessory: DATABASE.items.pingente_sorte
    };

    // Inventário de itens (chave: id, qtd)
    this.inventory = [
      { id: 'pocao_vida', qty: 3 },
      { id: 'pocao_mana', qty: 2 },
      { id: 'lamina_elfica', qty: 1 },
      { id: 'escudo_aco', qty: 1 }
    ];

    // Mão de cartas ativas
    this.hand = [
      DATABASE.cards[0], // Golpe Rápido
      DATABASE.cards[1], // Lâmina de Fogo
      DATABASE.cards[3], // Postura Defensiva
      DATABASE.cards[4], // Raio Arcano
      DATABASE.cards[5]  // Cura Sagrada
    ];

    this.selectedCard = null;
    this.shieldBuff = 0; // Armadura temporária
  }

  // Cálculos dinâmicos com equipamentos
  getTotalAttack() {
    let bonus = 0;
    for (let slot in this.equipment) {
      if (this.equipment[slot] && this.equipment[slot].attack) {
        bonus += this.equipment[slot].attack;
      }
    }
    return this.baseAttack + bonus;
  }

  getTotalDefense() {
    let bonus = 0;
    for (let slot in this.equipment) {
      if (this.equipment[slot] && this.equipment[slot].defense) {
        bonus += this.equipment[slot].defense;
      }
    }
    return this.baseDefense + bonus + this.shieldBuff;
  }

  heal(amount) {
    const prev = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const healed = this.hp - prev;
    sounds.playHeal();
    this.game.spawnFloatingText(`+${healed} HP`, this.x + 18, this.y - 10, '#2ecc71');
    this.game.updateHUD();
    return healed;
  }

  restoreMP(amount) {
    const prev = this.mp;
    this.mp = Math.min(this.maxMp, this.mp + amount);
    const restored = this.mp - prev;
    this.game.spawnFloatingText(`+${restored} MP`, this.x + 18, this.y - 10, '#3498db');
    this.game.updateHUD();
    return restored;
  }

  takeDamage(amount) {
    const finalDmg = Math.max(1, amount);
    this.hp = Math.max(0, this.hp - finalDmg);
    sounds.playEnemyHurt();
    this.game.spawnFloatingText(`-${finalDmg}`, this.x + 18, this.y - 10, '#e74c3c');
    this.game.shakeCamera(8, 0.25);
    this.game.updateHUD();

    if (this.hp <= 0) {
      this.game.triggerGameOver();
    }
    return finalDmg;
  }

  gainXP(amount) {
    this.xp += amount;
    this.game.logMessage(`✨ Você recebeu <b>+${amount} XP</b>!`, 'log-system');
    this.game.spawnFloatingText(`+${amount} XP`, this.x + 18, this.y - 25, '#f5c842');

    while (this.xp >= this.maxXp) {
      this.levelUp();
    }
    this.game.updateHUD();
  }

  levelUp() {
    this.xp -= this.maxXp;
    this.level += 1;
    this.maxXp = Math.round(this.maxXp * 1.5);
    this.maxHp += 20;
    this.hp = this.maxHp;
    this.maxMp += 10;
    this.mp = this.maxMp;
    this.baseAttack += 3;
    this.baseDefense += 2;

    sounds.playLevelUp();
    this.game.logMessage(`🎉 <b>SUBIU DE NÍVEL!</b> Você alcançou o Nível ${this.level}! Atributos aprimorados e vida recuperada!`, 'log-critical');
    this.game.showToast(`⭐ SUBIU DE NÍVEL: NÍVEL ${this.level}! ⭐`);
    this.game.spawnFloatingText(`NÍVEL ${this.level}!`, this.x + 18, this.y - 35, '#ffd700');
  }

  addItem(itemId, qty = 1) {
    const existing = this.inventory.find(i => i.id === itemId);
    if (existing) {
      existing.qty += qty;
    } else {
      this.inventory.push({ id: itemId, qty });
    }
    const itemData = DATABASE.items[itemId];
    const name = itemData ? itemData.name : itemId;
    this.game.showToast(`+${qty}x ${name} adicionado ao inventário!`);
  }

  equipItem(itemId) {
    const item = DATABASE.items[itemId];
    if (!item || item.type !== 'equipment') return;

    // Desequipa o atual se houver
    const current = this.equipment[item.slot];
    if (current) {
      this.addItem(current.id, 1);
    }

    // Remove 1 do inventário
    const invIndex = this.inventory.findIndex(i => i.id === itemId);
    if (invIndex !== -1) {
      this.inventory[invIndex].qty -= 1;
      if (this.inventory[invIndex].qty <= 0) {
        this.inventory.splice(invIndex, 1);
      }
    }

    this.equipment[item.slot] = item;
    sounds.playShieldBlock();
    this.game.logMessage(`🛡️ Você equipou: <b>${item.name}</b> (${item.statsText}).`, 'log-system');
    this.game.showToast(`Equipado: ${item.name}!`);
    this.game.updateHUD();
    this.game.renderInventory();
  }

  unequipItem(slot) {
    const item = this.equipment[slot];
    if (!item) return;

    this.addItem(item.id, 1);
    this.equipment[slot] = null;
    sounds.playClick();
    this.game.logMessage(`Você desequipou: <b>${item.name}</b>.`, 'log-system');
    this.game.updateHUD();
    this.game.renderInventory();
  }

  useConsumable(itemId) {
    const invIndex = this.inventory.findIndex(i => i.id === itemId);
    if (invIndex === -1) return;

    const item = DATABASE.items[itemId];
    if (!item || item.type !== 'consumable') return;

    if (item.effect) {
      const msg = item.effect(this);
      this.game.logMessage(`🧪 ${msg}`, 'log-heal');
    }

    this.inventory[invIndex].qty -= 1;
    if (this.inventory[invIndex].qty <= 0) {
      this.inventory.splice(invIndex, 1);
    }

    this.game.renderInventory();
  }

  update(dt, keys, map) {
    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      // Normalização diagonal
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.isMoving = (dx !== 0 || dy !== 0);

    if (this.isMoving) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else {
        this.direction = dy > 0 ? 'down' : 'up';
      }

      this.walkAnimTimer += dt;
      if (this.walkAnimTimer > 0.16) {
        this.walkAnimTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }

      const moveStepX = dx * this.speed * dt;
      const moveStepY = dy * this.speed * dt;

      // Colisão no eixo X
      const nextX = this.x + moveStepX;
      if (!map.checkCollision(nextX, this.y, this.width, this.height)) {
        this.x = nextX;
      }

      // Colisão no eixo Y
      const nextY = this.y + moveStepY;
      if (!map.checkCollision(this.x, nextY, this.width, this.height)) {
        this.y = nextY;
      }

      // Mantém nos limites do mapa
      this.x = Math.max(10, Math.min(map.pixelWidth - this.width - 10, this.x));
      this.y = Math.max(10, Math.min(map.pixelHeight - this.height - 10, this.y));

      // Verifica coleta de itens do chão
      map.checkCollectibles(this);
    } else {
      this.walkFrame = 0;
      this.walkAnimTimer = 0;
    }
  }

  draw(ctx, camera) {
    const screenX = Math.round(this.x - camera.x);
    const screenY = Math.round(this.y - camera.y);

    ctx.save();

    // Sombra suave sob o personagem
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(screenX + 18, screenY + 38, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bobbing de caminhada
    const bob = this.isMoving ? Math.sin(this.walkFrame * Math.PI / 2) * 2 : 0;

    // Aura se tiver escudo temporário
    if (this.shieldBuff > 0) {
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX + 18, screenY + 20, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    // DESENHO PROCEDURAL DO HERÓI (Pixel-art limpo e detalhado)
    // 1. Capa / Manto
    ctx.fillStyle = '#1e3799';
    ctx.fillRect(screenX + 8, screenY + 14 + bob, 20, 22);

    // 2. Corpo / Túnica
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(screenX + 10, screenY + 16 + bob, 16, 18);

    // 3. Cinto e Fivela
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(screenX + 10, screenY + 26 + bob, 16, 3);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(screenX + 16, screenY + 26 + bob, 4, 3);

    // 4. Pernas e Botas
    const legOffset = this.isMoving ? (this.walkFrame % 2 === 0 ? 3 : -3) : 0;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(screenX + 11, screenY + 34 + bob + legOffset, 5, 8);
    ctx.fillRect(screenX + 20, screenY + 34 + bob - legOffset, 5, 8);

    // Botas de couro
    ctx.fillStyle = '#4a2c11';
    ctx.fillRect(screenX + 10, screenY + 38 + bob + legOffset, 6, 4);
    ctx.fillRect(screenX + 20, screenY + 38 + bob - legOffset, 6, 4);

    // 5. Cabeça e Rosto
    ctx.fillStyle = '#f5cd79'; // Tom de pele
    ctx.fillRect(screenX + 11, screenY + 6 + bob, 14, 11);

    // Olhos e Direção
    ctx.fillStyle = '#1e272e';
    if (this.direction === 'down') {
      ctx.fillRect(screenX + 13, screenY + 11 + bob, 2, 3);
      ctx.fillRect(screenX + 21, screenY + 11 + bob, 2, 3);
    } else if (this.direction === 'up') {
      // De costas (mostra o capuz)
      ctx.fillStyle = '#1e3799';
      ctx.fillRect(screenX + 10, screenY + 5 + bob, 16, 12);
    } else if (this.direction === 'left') {
      ctx.fillRect(screenX + 12, screenY + 11 + bob, 2, 3);
    } else if (this.direction === 'right') {
      ctx.fillRect(screenX + 22, screenY + 11 + bob, 2, 3);
    }

    // Cabelo / Elmo com gema mágica
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(screenX + 9, screenY + 4 + bob, 18, 5);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(screenX + 16, screenY + 3 + bob, 4, 3);

    // 6. Arma e Escudo nas mãos
    if (this.direction !== 'up') {
      // Espada na mão direita
      ctx.fillStyle = '#bdc3c7';
      ctx.fillRect(screenX + 27, screenY + 16 + bob, 3, 14);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(screenX + 25, screenY + 22 + bob, 7, 2);

      // Escudo na mão esquerda
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(screenX + 5, screenY + 18 + bob, 5, 12);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(screenX + 6, screenY + 22 + bob, 3, 4);
    }

    ctx.restore();
  }
}

/* ==========================================================================
   5. INIMIGOS (BESTIÁRIO E INTELIGÊNCIA ARTIFICIAL)
   ========================================================================== */
class Enemy {
  constructor(game, typeKey, x, y) {
    this.game = game;
    this.typeKey = typeKey;
    this.template = DATABASE.bestiary[typeKey];
    this.name = this.template.name;
    this.icon = this.template.icon;
    this.color = this.template.color;
    this.maxHp = this.template.maxHp;
    this.hp = this.maxHp;
    this.attack = this.template.attack;
    this.defense = this.template.defense;
    this.xp = this.template.xp;
    this.gold = this.template.gold;
    this.speed = this.template.speed;
    this.aggroRadius = this.template.aggroRadius;
    this.isBoss = !!this.template.isBoss;

    this.x = x;
    this.y = y;
    this.width = this.isBoss ? 48 : 34;
    this.height = this.isBoss ? 52 : 38;

    this.homeX = x;
    this.homeY = y;
    this.isAggro = false;
    this.animTimer = Math.random();
    this.isDead = false;
    this.stunned = false;
  }

  takeDamage(amount) {
    const finalDmg = Math.max(1, amount);
    this.hp = Math.max(0, this.hp - finalDmg);
    sounds.playEnemyHurt();

    if (this.hp <= 0) {
      this.die();
    }
    return finalDmg;
  }

  die() {
    this.isDead = true;
    sounds.playEnemyHurt();
    this.game.logMessage(`💀 <b>${this.name}</b> foi derrotado! Você ganhou <b>+${this.xp} XP</b> e <b>+${this.gold} Ouro</b>!`, 'log-victory');
    this.game.player.gainXP(this.xp);
    this.game.player.gold += this.gold;
    this.game.player.enemiesDefeated += 1;

    // Chance de Drop de Item
    if (this.template.drops && this.template.drops.length > 0) {
      const dropId = this.template.drops[Math.floor(Math.random() * this.template.drops.length)];
      this.game.player.addItem(dropId, 1);
      this.game.logMessage(`🎁 O inimigo deixou cair um item: <b>${DATABASE.items[dropId].name}</b>!`, 'log-dice');
    }

    this.game.updateHUD();

    // Se o Boss for derrotado, aciona a Tela de Vitória!
    if (this.isBoss) {
      setTimeout(() => {
        this.game.triggerVictory();
      }, 1200);
    }
  }

  update(dt, player, map) {
    if (this.isDead) return;

    this.animTimer += dt;

    // Distância até o jogador
    const distToPlayer = Math.hypot((player.x + 18) - (this.x + this.width / 2), (player.y + 20) - (this.y + this.height / 2));

    if (distToPlayer < this.aggroRadius) {
      this.isAggro = true;
      // Persegue o jogador suavemente sem sobrepor completamente
      if (distToPlayer > 38) {
        const angle = Math.atan2((player.y) - this.y, (player.x) - this.x);
        const nextX = this.x + Math.cos(angle) * this.speed * dt;
        const nextY = this.y + Math.sin(angle) * this.speed * dt;

        if (!map.checkCollision(nextX, this.y, this.width, this.height)) {
          this.x = nextX;
        }
        if (!map.checkCollision(this.x, nextY, this.width, this.height)) {
          this.y = nextY;
        }
      }
    } else {
      this.isAggro = false;
      // Patrulha / Retorna para a área inicial
      const distToHome = Math.hypot(this.homeX - this.x, this.homeY - this.y);
      if (distToHome > 20) {
        const angle = Math.atan2(this.homeY - this.y, this.homeX - this.x);
        this.x += Math.cos(angle) * (this.speed * 0.4) * dt;
        this.y += Math.sin(angle) * (this.speed * 0.4) * dt;
      }
    }
  }

  draw(ctx, camera, isHovered) {
    if (this.isDead) return;

    const screenX = Math.round(this.x - camera.x);
    const screenY = Math.round(this.y - camera.y);

    ctx.save();

    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(screenX + this.width / 2, screenY + this.height + 2, this.width / 2.2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = Math.sin(this.animTimer * 4) * 2;

    // Efeito de destaque quando sob a mira do cursor
    if (isHovered) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(screenX - 6, screenY - 6 + bob, this.width + 12, this.height + 12);
      ctx.setLineDash([]);

      // Mira nos 4 cantos
      ctx.fillStyle = '#ff3838';
      const sz = 6;
      ctx.fillRect(screenX - 8, screenY - 8 + bob, sz, 2);
      ctx.fillRect(screenX - 8, screenY - 8 + bob, 2, sz);
      ctx.fillRect(screenX + this.width + 2, screenY - 8 + bob, sz, 2);
      ctx.fillRect(screenX + this.width + 6, screenY - 8 + bob, 2, sz);
    }

    // DESENHO PROCEDURAL DE CADA TIPO DE INIMIGO
    if (this.typeKey === 'goblin') {
      // Goblin Ladino (pele verde, adaga, capuz rasgado)
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(screenX + 8, screenY + 12 + bob, 18, 18);
      // Cabeça
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(screenX + 9, screenY + 4 + bob, 16, 10);
      // Orelhas pontudas
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(screenX + 5, screenY + 6 + bob, 4, 4);
      ctx.fillRect(screenX + 25, screenY + 6 + bob, 4, 4);
      // Olhos amarelos malignos
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(screenX + 11, screenY + 8 + bob, 3, 3);
      ctx.fillRect(screenX + 20, screenY + 8 + bob, 3, 3);
      // Adaga enferrujada
      ctx.fillStyle = '#795548';
      ctx.fillRect(screenX + 27, screenY + 16 + bob, 2, 10);
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(screenX + 26, screenY + 12 + bob, 4, 6);
    } else if (this.typeKey === 'esqueleto') {
      // Esqueleto Guerreiro (ossos brancos, elmo com chifres, escudo)
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(screenX + 9, screenY + 14 + bob, 16, 16);
      // Costelas / Vazio
      ctx.fillStyle = '#212121';
      ctx.fillRect(screenX + 11, screenY + 18 + bob, 12, 2);
      ctx.fillRect(screenX + 12, screenY + 23 + bob, 10, 2);
      // Crânio
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(screenX + 10, screenY + 4 + bob, 14, 10);
      // Órbitas oculares vazias
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(screenX + 12, screenY + 7 + bob, 3, 3);
      ctx.fillRect(screenX + 19, screenY + 7 + bob, 3, 3);
      // Elmo chifrudo
      ctx.fillStyle = '#455a64';
      ctx.fillRect(screenX + 9, screenY + 2 + bob, 16, 4);
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(screenX + 6, screenY + 1 + bob, 3, 5);
      ctx.fillRect(screenX + 25, screenY + 1 + bob, 3, 5);
    } else if (this.typeKey === 'orc') {
      // Orc Brutamontes (grande, pele marrom/oliva, presas e martelo)
      ctx.fillStyle = '#556b2f';
      ctx.fillRect(screenX + 6, screenY + 12 + bob, 22, 22);
      // Cabeça bruta
      ctx.fillStyle = '#6b8e23';
      ctx.fillRect(screenX + 8, screenY + 2 + bob, 18, 12);
      // Presas brancas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX + 10, screenY + 11 + bob, 3, 4);
      ctx.fillRect(screenX + 21, screenY + 11 + bob, 3, 4);
      // Olhos vermelhos
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(screenX + 11, screenY + 6 + bob, 3, 3);
      ctx.fillRect(screenX + 20, screenY + 6 + bob, 3, 3);
      // Martelo de guerra de pedra
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(screenX + 28, screenY + 14 + bob, 3, 18);
      ctx.fillStyle = '#616161';
      ctx.fillRect(screenX + 26, screenY + 8 + bob, 8, 8);
    } else if (this.typeKey === 'necromante') {
      // Boss Necromante Sombrio (manto roxo escuro, cetro com caveira)
      ctx.fillStyle = '#4a148c';
      ctx.fillRect(screenX + 8, screenY + 12 + bob, 32, 34);
      // Capuz
      ctx.fillStyle = '#311b92';
      ctx.fillRect(screenX + 12, screenY + 4 + bob, 24, 16);
      // Olhos de fogo roxo
      ctx.fillStyle = '#ea80fc';
      ctx.fillRect(screenX + 18, screenY + 11 + bob, 4, 3);
      ctx.fillRect(screenX + 26, screenY + 11 + bob, 4, 3);
      // Cetro místico
      ctx.fillStyle = '#212121';
      ctx.fillRect(screenX + 40, screenY + 10 + bob, 4, 36);
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(screenX + 42, screenY + 8 + bob, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mini Barra de Vida sobre o Inimigo
    const hpRatio = this.hp / this.maxHp;
    const barWidth = this.width;
    const barHeight = 4;
    const barX = screenX;
    const barY = screenY - 12 + bob;

    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Nome e Ícone
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Nunito';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.name}`, screenX + this.width / 2, barY - 3);

    ctx.restore();
  }
}

/* ==========================================================================
   6. MAPA, CENÁRIO, OBSTÁCULOS E COLISÕES
   ========================================================================== */
class GameMap {
  constructor(game) {
    this.game = game;
    this.tileSize = 48;
    this.cols = 40;
    this.rows = 30;
    this.pixelWidth = this.cols * this.tileSize;
    this.pixelHeight = this.rows * this.tileSize;

    // Grid de tiles (0: Grama, 1: Estrada de Pedra, 2: Água, 3: Parede de Ruína)
    this.tiles = [];
    this.obstacles = []; // Retângulos de colisão sólida
    this.chests = [];    // Baús com itens
    this.npcs = [];      // NPCs de diálogo
    this.collectibles = []; // Flores de vida, cristais de mana, moedas

    this.initMapData();
  }

  initMapData() {
    // 1. Gera terreno
    for (let r = 0; r < this.rows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < this.cols; c++) {
        // Rio atravessando o mapa verticalmente
        if (c >= 22 && c <= 24 && !(r >= 13 && r <= 15)) {
          this.tiles[r][c] = 2; // Água
        } else if ((r === 14 || r === 15) || (c === 12 && r < 20)) {
          this.tiles[r][c] = 1; // Estrada de pedra / Ponte
        } else {
          this.tiles[r][c] = 0; // Grama verde
        }
      }
    }

    // 2. Cria Colisões de Água (exceto na ponte r: 13-15)
    for (let r = 0; r < this.rows; r++) {
      if (!(r >= 13 && r <= 15)) {
        this.obstacles.push({
          x: 22 * this.tileSize,
          y: r * this.tileSize,
          w: 3 * this.tileSize,
          h: this.tileSize
        });
      }
    }

    // 3. Adiciona Árvores e Pedras (Obstáculos)
    // Bosque à esquerda
    for (let r = 2; r <= 8; r += 2) {
      for (let c = 2; c <= 8; c += 2) {
        this.addTree(c * this.tileSize, r * this.tileSize);
      }
    }

    // Floresta profunda ao sul
    for (let c = 3; c <= 35; c += 4) {
      this.addTree(c * this.tileSize, 26 * this.tileSize);
      this.addTree((c + 2) * this.tileSize, 28 * this.tileSize);
    }

    // Pedras e Ruínas Antigas no quadrante direito superior (Covil do Necromante)
    for (let r = 2; r <= 8; r++) {
      this.addStoneWall(30 * this.tileSize, r * this.tileSize);
      this.addStoneWall(38 * this.tileSize, r * this.tileSize);
    }
    for (let c = 30; c <= 38; c++) {
      if (c !== 34) { // Entrada da ruína
        this.addStoneWall(c * this.tileSize, 2 * this.tileSize);
      }
    }

    // Cabana do Ferreiro no centro-oeste
    this.addBuilding(6 * this.tileSize, 12 * this.tileSize, 140, 110);

    // 4. Baús de Tesouro Espalhados
    this.chests = [
      {
        id: 'chest_1',
        x: 4 * this.tileSize,
        y: 4 * this.tileSize,
        opened: false,
        loot: [
          { type: 'item', id: 'pocao_vida', qty: 2 },
          { type: 'gold', amount: 35 }
        ]
      },
      {
        id: 'chest_2',
        x: 18 * this.tileSize,
        y: 6 * this.tileSize,
        opened: false,
        loot: [
          { type: 'item', id: 'pocao_mana', qty: 2 },
          { type: 'item', id: 'anel_rubi', qty: 1 }
        ]
      },
      {
        id: 'chest_3',
        x: 35 * this.tileSize,
        y: 5 * this.tileSize,
        opened: false,
        loot: [
          { type: 'item', id: 'chave_dourada', qty: 1 },
          { type: 'item', id: 'armadura_placas', qty: 1 },
          { type: 'gold', amount: 100 }
        ]
      }
    ];

    // Registra colisão dos baús
    this.chests.forEach(ch => {
      this.obstacles.push({ x: ch.x + 4, y: ch.y + 10, w: 40, h: 32 });
    });

    // 5. NPCs com Diálogo
    this.npcs = [
      {
        id: 'eldrin',
        name: 'Eldrin, o Sábio dos Dados',
        x: 10 * this.tileSize,
        y: 13 * this.tileSize,
        avatar: '🧙‍♂️',
        dialog: 'Saudações, herói! Para vencer o combate nesta terra, selecione uma carta, gire o Dado D6 com o Botão Esquerdo do Mouse e confirme o golpe com o Botão Direito no inimigo! Se tirar 6, você causará um CRÍTICO SUPREMO!'
      },
      {
        id: 'thrain',
        name: 'Thrain, o Ferreiro',
        x: 10 * this.tileSize,
        y: 16 * this.tileSize,
        avatar: '🧔',
        dialog: 'Opa, viajante! Pressione ESPAÇO a qualquer momento para abrir sua mochila. Equipe boas armas e armaduras para aguentar os monstros ao leste do rio!'
      }
    ];

    this.npcs.forEach(npc => {
      this.obstacles.push({ x: npc.x + 6, y: npc.y + 12, w: 36, h: 32 });
    });

    // 6. Itens Coletáveis no Chão
    this.collectibles = [
      { type: 'hp_herb', x: 8 * this.tileSize + 20, y: 7 * this.tileSize, collected: false },
      { type: 'mana_crystal', x: 16 * this.tileSize + 10, y: 18 * this.tileSize, collected: false },
      { type: 'coin', x: 26 * this.tileSize + 14, y: 14 * this.tileSize, collected: false },
      { type: 'coin', x: 28 * this.tileSize + 10, y: 20 * this.tileSize, collected: false },
      { type: 'hp_herb', x: 32 * this.tileSize, y: 22 * this.tileSize, collected: false }
    ];
  }

  addTree(x, y) {
    this.obstacles.push({ x: x + 14, y: y + 26, w: 20, h: 18, type: 'tree', fullX: x, fullY: y });
  }

  addStoneWall(x, y) {
    this.obstacles.push({ x, y, w: this.tileSize, h: this.tileSize, type: 'wall' });
  }

  addBuilding(x, y, w, h) {
    this.obstacles.push({ x, y, w, h, type: 'house' });
  }

  checkCollision(x, y, width, height) {
    // Caixa delimitadora do personagem (foco nos pés para profundidade 2.5D)
    const pBox = {
      x: x + 6,
      y: y + height - 16,
      w: width - 12,
      h: 14
    };

    for (let obs of this.obstacles) {
      if (
        pBox.x < obs.x + obs.w &&
        pBox.x + pBox.w > obs.x &&
        pBox.y < obs.y + obs.h &&
        pBox.y + pBox.h > obs.y
      ) {
        return true;
      }
    }
    return false;
  }

  checkCollectibles(player) {
    const px = player.x + 18;
    const py = player.y + 20;

    this.collectibles.forEach(col => {
      if (!col.collected && Math.hypot(px - col.x, py - col.y) < 28) {
        col.collected = true;
        sounds.playClick();
        if (col.type === 'hp_herb') {
          player.heal(25);
          this.game.logMessage('🌿 Você colheu uma Erva Medicinal (+25 HP)!', 'log-heal');
        } else if (col.type === 'mana_crystal') {
          player.restoreMP(25);
          this.game.logMessage('💎 Você coletou um Cristal Astral (+25 MP)!', 'log-heal');
        } else if (col.type === 'coin') {
          player.gold += 20;
          sounds.playChestOpen();
          this.game.logMessage('🪙 Você encontrou uma bolsa com 20 Moedas de Ouro!', 'log-system');
          this.game.spawnFloatingText('+20 Ouro', col.x, col.y - 15, '#ffd700');
          this.game.updateHUD();
        }
      }
    });
  }

  getNearbyInteractive(player) {
    const px = player.x + 18;
    const py = player.y + 20;

    // Verifica baús
    for (let chest of this.chests) {
      if (!chest.opened && Math.hypot(px - (chest.x + 24), py - (chest.y + 24)) < 65) {
        return { type: 'chest', data: chest, label: 'Pressione [E] para Abrir Baú' };
      }
    }

    // Verifica NPCs
    for (let npc of this.npcs) {
      if (Math.hypot(px - (npc.x + 24), py - (npc.y + 24)) < 65) {
        return { type: 'npc', data: npc, label: `Pressione [E] para Falar com ${npc.name}` };
      }
    }

    return null;
  }

  draw(ctx, camera) {
    const startCol = Math.max(0, Math.floor(camera.x / this.tileSize));
    const endCol = Math.min(this.cols - 1, Math.ceil((camera.x + camera.width) / this.tileSize));
    const startRow = Math.max(0, Math.floor(camera.y / this.tileSize));
    const endRow = Math.min(this.rows - 1, Math.ceil((camera.y + camera.height) / this.tileSize));

    // 1. Renderiza Tiles do Chão
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const x = c * this.tileSize - camera.x;
        const y = r * this.tileSize - camera.y;
        const type = this.tiles[r][c];

        if (type === 0) {
          // Grama com textura procedural
          ctx.fillStyle = (r + c) % 2 === 0 ? '#385e38' : '#3d663d';
          ctx.fillRect(x, y, this.tileSize, this.tileSize);

          // Flores e detalhes aleatórios fixos
          if ((r * 13 + c * 7) % 11 === 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(x + 12, y + 14, 3, 3);
          } else if ((r * 17 + c * 5) % 13 === 0) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(x + 28, y + 24, 3, 3);
          }
        } else if (type === 1) {
          // Estrada de Pedra
          ctx.fillStyle = '#7f8c8d';
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          ctx.fillStyle = '#95a5a6';
          ctx.fillRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
          ctx.strokeStyle = '#5a6265';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
        } else if (type === 2) {
          // Água com ondulações
          ctx.fillStyle = '#1b4f72';
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          ctx.fillStyle = '#2980b9';
          ctx.fillRect(x + 6, y + 10, 24, 3);
          ctx.fillRect(x + 18, y + 26, 20, 3);
        }
      }
    }

    // 2. Renderiza Paredes de Ruínas
    this.obstacles.forEach(obs => {
      if (obs.type === 'wall') {
        const x = obs.x - camera.x;
        const y = obs.y - camera.y;
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x, y, obs.w, obs.h);
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(x + 4, y + 4, obs.w - 8, obs.h - 8);
        ctx.strokeStyle = '#374151';
        ctx.strokeRect(x, y, obs.w, obs.h);
      } else if (obs.type === 'house') {
        const x = obs.x - camera.x;
        const y = obs.y - camera.y;
        // Paredes de Madeira
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x, y + 30, obs.w, obs.h - 30);
        // Telhado Vermelho Triangular
        ctx.fillStyle = '#962d2d';
        ctx.beginPath();
        ctx.moveTo(x - 10, y + 32);
        ctx.lineTo(x + obs.w / 2, y);
        ctx.lineTo(x + obs.w + 10, y + 32);
        ctx.closePath();
        ctx.fill();
        // Porta e Janela
        ctx.fillStyle = '#261509';
        ctx.fillRect(x + obs.w / 2 - 14, y + obs.h - 40, 28, 40);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x + 20, y + 45, 20, 20);
      }
    });

    // 3. Renderiza Coletáveis
    this.collectibles.forEach(col => {
      if (!col.collected) {
        const x = col.x - camera.x;
        const y = col.y - camera.y;
        ctx.save();
        if (col.type === 'hp_herb') {
          ctx.font = '20px sans-serif';
          ctx.fillText('🌿', x - 10, y + 8);
        } else if (col.type === 'mana_crystal') {
          ctx.font = '20px sans-serif';
          ctx.fillText('💎', x - 10, y + 8);
        } else if (col.type === 'coin') {
          ctx.font = '18px sans-serif';
          ctx.fillText('🪙', x - 9, y + 7);
        }
        ctx.restore();
      }
    });

    // 4. Renderiza Baús
    this.chests.forEach(ch => {
      const x = ch.x - camera.x;
      const y = ch.y - camera.y;
      ctx.save();
      ctx.font = '30px sans-serif';
      ctx.fillText(ch.opened ? '📭' : '🎁', x + 4, y + 34);
      ctx.restore();
    });

    // 5. Renderiza NPCs
    this.npcs.forEach(npc => {
      const x = npc.x - camera.x;
      const y = npc.y - camera.y;
      ctx.save();
      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x + 24, y + 40, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Avatar
      ctx.font = '32px sans-serif';
      ctx.fillText(npc.avatar, x + 8, y + 34);
      // Nome
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Nunito';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, x + 24, y - 4);
      ctx.restore();
    });

    // 6. Renderiza Árvores
    this.obstacles.forEach(obs => {
      if (obs.type === 'tree') {
        const x = obs.fullX - camera.x;
        const y = obs.fullY - camera.y;
        ctx.save();
        // Tronco
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 18, y + 26, 12, 20);
        // Copa da Árvore
        ctx.fillStyle = '#225522';
        ctx.beginPath();
        ctx.arc(x + 24, y + 16, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(x + 22, y + 14, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }
}

/* ==========================================================================
   7. CONTROLADOR PRINCIPAL DO JOGO (GAME ENGINE)
   Conecta movimentação, mouse, dados D6, cartas, combate e interfaces
   ========================================================================== */
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.keys = {};
    this.mouse = {
      worldX: 0,
      worldY: 0,
      screenX: 0,
      screenY: 0,
      isDown: false
    };

    this.camera = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      shakeIntensity: 0,
      shakeDuration: 0
    };

    this.floatingTexts = [];
    this.particles = [];
    this.state = 'START_SCREEN'; // 'START_SCREEN', 'PLAYING', 'PAUSED', 'GAME_OVER', 'VICTORY'

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.map = new GameMap(this);
    this.player = new Player(this, 12 * 48, 14 * 48);
    this.dice = new DiceManager(this);

    // Instancia os Inimigos no Mapa
    this.enemies = [
      new Enemy(this, 'goblin', 8 * 48, 8 * 48),
      new Enemy(this, 'goblin', 16 * 48, 4 * 48),
      new Enemy(this, 'esqueleto', 28 * 48, 14 * 48),
      new Enemy(this, 'esqueleto', 32 * 48, 18 * 48),
      new Enemy(this, 'orc', 26 * 48, 8 * 48),
      new Enemy(this, 'necromante', 34 * 48, 5 * 48) // Mini-Boss Final
    ];

    this.hoveredEnemy = null;

    this.setupEventListeners();
    this.renderCardsHand();
    this.updateHUD();

    // Detecção e ativação de controles mobile / touch
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024) {
      document.getElementById('game-app').classList.add('is-mobile-device');
    }

    // Inicia loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  resizeCanvas() {
    const container = document.getElementById('viewport-container');
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.camera.width = this.canvas.width;
    this.camera.height = this.canvas.height;
  }

  /* ========================================================================
     CONTROLES E EVENTOS DE ENTRADA (WASD, MOUSE BOTÃO ESQUERDO E DIREITO)
     ======================================================================== */
  setupEventListeners() {
    // 1. Teclado
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;

      // ESPAÇO: Abrir/Fechar Inventário
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleInventory();
      }

      // E: Interação com Objeto Próximo (Baús e NPCs)
      if (e.code === 'KeyE') {
        this.handleInteraction();
      }

      // ESC: Menu de Pausa
      if (e.code === 'Escape') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    // 2. Movimento do Mouse (Mira e Detecção de Alvo)
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.screenX = e.clientX - rect.left;
      this.mouse.screenY = e.clientY - rect.top;
      this.mouse.worldX = this.mouse.screenX + this.camera.x;
      this.mouse.worldY = this.mouse.screenY + this.camera.y;

      this.updateHoveredEnemy();
    });

    // 3. BOTÃO ESQUERDO DO MOUSE (ROLAGEM DO DADO D6)
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Botão Esquerdo
        if (this.state === 'PLAYING') {
          // Regra Fundamental: Botão esquerdo gira o dado D6!
          this.dice.roll();
        }
      } else if (e.button === 2) { // Botão Direito
        // CONFIRMA OU EXECUTA O ATAQUE COM A CARTA SELECIONADA
        this.confirmAttack();
      }
    });

    // Botão de Rolagem no HUD também funciona com o botão esquerdo
    document.getElementById('btn-roll-dice').addEventListener('click', (e) => {
      e.stopPropagation();
      this.dice.roll();
    });

    document.getElementById('dice-container').addEventListener('click', () => {
      this.dice.roll();
    });

    // 4. Botões dos Menus e Interface
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-how-to-play').addEventListener('click', () => this.showModal('how-to-play-modal'));
    document.getElementById('btn-close-how').addEventListener('click', () => this.hideModal('how-to-play-modal'));
    document.getElementById('btn-close-how-ok').addEventListener('click', () => this.hideModal('how-to-play-modal'));

    document.getElementById('btn-credits').addEventListener('click', () => this.showModal('credits-modal'));
    document.getElementById('btn-close-credits').addEventListener('click', () => this.hideModal('credits-modal'));
    document.getElementById('btn-close-credits-ok').addEventListener('click', () => this.hideModal('credits-modal'));

    document.getElementById('btn-toggle-inv').addEventListener('click', () => this.toggleInventory());
    document.getElementById('btn-close-inv').addEventListener('click', () => this.hideModal('inventory-modal'));

    document.getElementById('btn-toggle-sound').addEventListener('click', () => {
      const muted = sounds.toggleMute();
      document.getElementById('sound-icon').textContent = muted ? '🔇' : '🔊';
    });

    document.getElementById('btn-pause-game').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-resume-game').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-pause-how').addEventListener('click', () => this.showModal('how-to-play-modal'));
    document.getElementById('btn-restart-game').addEventListener('click', () => location.reload());

    document.getElementById('btn-retry-game').addEventListener('click', () => location.reload());
    document.getElementById('btn-victory-restart').addEventListener('click', () => location.reload());

    // 5. CONTROLES TOUCH MOBILE (VIRTUAL D-PAD E AÇÕES TOUCH)
    const setupTouchBtn = (elementId, keyChar) => {
      const btn = document.getElementById(elementId);
      if (!btn) return;

      const startMove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys[keyChar] = true;
        btn.classList.add('active');
      };

      const stopMove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys[keyChar] = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('touchstart', startMove, { passive: false });
      btn.addEventListener('touchend', stopMove, { passive: false });
      btn.addEventListener('touchcancel', stopMove, { passive: false });
      btn.addEventListener('mousedown', startMove);
      btn.addEventListener('mouseup', stopMove);
      btn.addEventListener('mouseleave', stopMove);
    };

    setupTouchBtn('btn-touch-up', 'w');
    setupTouchBtn('btn-touch-down', 's');
    setupTouchBtn('btn-touch-left', 'a');
    setupTouchBtn('btn-touch-right', 'd');

    // Botões de Ação Touch
    const btnTouchAttack = document.getElementById('btn-touch-attack');
    if (btnTouchAttack) {
      btnTouchAttack.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.confirmAttack();
      }, { passive: false });
      btnTouchAttack.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmAttack();
      });
    }

    const btnTouchInteract = document.getElementById('btn-touch-interact');
    if (btnTouchInteract) {
      btnTouchInteract.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleInteraction();
      }, { passive: false });
      btnTouchInteract.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleInteraction();
      });
    }

    // Touch no Canvas (Mira de toque e rolagem de dado com toque)
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.state !== 'PLAYING') return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.screenX = touch.clientX - rect.left;
        this.mouse.screenY = touch.clientY - rect.top;
        this.mouse.worldX = this.mouse.screenX + this.camera.x;
        this.mouse.worldY = this.mouse.screenY + this.camera.y;

        this.updateHoveredEnemy();

        // Se tocou no chão vazio sem inimigo e o dado ainda não foi rolado, rola o dado
        if (!this.hoveredEnemy && this.dice.currentValue === null) {
          this.dice.roll();
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.state !== 'PLAYING') return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.screenX = touch.clientX - rect.left;
        this.mouse.screenY = touch.clientY - rect.top;
        this.mouse.worldX = this.mouse.screenX + this.camera.x;
        this.mouse.worldY = this.mouse.screenY + this.camera.y;
        this.updateHoveredEnemy();
      }
    }, { passive: true });

    document.getElementById('btn-dialog-close').addEventListener('click', () => this.hideModal('dialog-modal'));
    document.getElementById('btn-collect-chest').addEventListener('click', () => this.hideModal('chest-modal'));

    document.getElementById('btn-clear-log').addEventListener('click', () => {
      document.getElementById('combat-log-feed').innerHTML = '<div class="log-entry log-system">Histórico de combate limpo.</div>';
    });

    // Abas do Inventário
    const tabs = document.querySelectorAll('.inv-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderInventory(tab.dataset.category);
      });
    });
  }

  startGame() {
    sounds.init();
    sounds.playLevelUp();
    this.state = 'PLAYING';
    document.getElementById('start-screen').classList.add('hidden');
    this.showToast('⚔️ Aventura iniciada! Mova-se com WASD e explore o reino!');
  }

  /* ========================================================================
     DETECÇÃO DE MIRA E SELEÇÃO DE ALVOS COM O MOUSE
     ======================================================================== */
  updateHoveredEnemy() {
    if (this.state !== 'PLAYING') return;

    let target = null;
    const mx = this.mouse.worldX;
    const my = this.mouse.worldY;

    for (let enemy of this.enemies) {
      if (!enemy.isDead) {
        // Verifica se o cursor está dentro da caixa do inimigo
        if (mx >= enemy.x && mx <= enemy.x + enemy.width && my >= enemy.y && my <= enemy.y + enemy.height) {
          target = enemy;
          break;
        }
      }
    }

    this.hoveredEnemy = target;

    // Atualiza HUD da Mira
    const targetHud = document.getElementById('target-reticle-hud');
    const checkTarget = document.getElementById('check-target');

    if (this.hoveredEnemy) {
      targetHud.classList.remove('hidden');
      document.getElementById('target-name').textContent = this.hoveredEnemy.name;
      document.getElementById('target-icon').textContent = this.hoveredEnemy.icon;
      document.getElementById('target-lvl').textContent = this.hoveredEnemy.isBoss ? 'CHEFÃO' : 'Nv. 1';
      document.getElementById('target-hp-text').textContent = `HP: ${this.hoveredEnemy.hp} / ${this.hoveredEnemy.maxHp}`;
      document.getElementById('target-def-text').textContent = `Defesa: ${this.hoveredEnemy.defense}`;

      const hpRatio = (this.hoveredEnemy.hp / this.hoveredEnemy.maxHp) * 100;
      document.getElementById('target-hp-bar').style.width = `${hpRatio}%`;

      checkTarget.classList.add('ready');
      checkTarget.querySelector('.check-icon').textContent = '✅';
    } else {
      targetHud.classList.add('hidden');
      checkTarget.classList.remove('ready');
      checkTarget.querySelector('.check-icon').textContent = '⚪';
    }

    this.updateAttackStatus();
  }

  updateAttackStatus() {
    const hasCard = !!this.player.selectedCard;
    const hasDice = this.dice.currentValue !== null;
    const hasTarget = !!this.hoveredEnemy;

    const badge = document.getElementById('confirm-attack-badge');
    if (hasCard && hasDice && hasTarget) {
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  }

  /* ========================================================================
     SISTEMA DE COMBATE (CARTA + DADO D6 + BOTÃO DIREITO)
     ======================================================================== */
  confirmAttack() {
    if (this.state !== 'PLAYING') return;

    // 1. Validação de Carta Selecionada
    if (!this.player.selectedCard) {
      this.showToast('⚠️ Selecione uma carta de habilidade na sua mão primeiro!');
      sounds.playEnemyHurt();
      return;
    }

    // 2. Validação de Dado Rolado
    if (this.dice.currentValue === null) {
      this.showToast('🎲 Gire o Dado D6 com o Botão Esquerdo do Mouse antes de atacar!');
      sounds.playEnemyHurt();
      return;
    }

    // 3. Validação de Alvo sob a Mira
    if (!this.hoveredEnemy || this.hoveredEnemy.isDead) {
      this.showToast('🎯 Aponte o cursor sobre um inimigo válido para atacar!');
      sounds.playEnemyHurt();
      return;
    }

    const card = this.player.selectedCard;
    const target = this.hoveredEnemy;
    const diceVal = this.dice.currentValue;

    // 4. Verificação de Custo de Mana
    if (this.player.mp < card.cost) {
      this.showToast('🔮 Mana insuficiente para usar esta carta!');
      sounds.playEnemyHurt();
      return;
    }

    // Deduz Mana
    this.player.mp -= card.cost;
    this.updateHUD();

    // 5. CÁLCULO COMPLETO DO DANO
    const diceMeta = this.dice.getMultiplier(diceVal);
    const diceMultiplier = diceMeta.mult;
    const isCritical = (diceVal === 6);

    let baseDamage = (card.power + this.player.getTotalAttack());
    let defenseReduction = target.defense * 0.4;

    if (card.id === 'golpe_pesado') {
      defenseReduction *= 0.6; // Ignora 40% da defesa
    }

    let calculatedDamage = Math.max(1, Math.round((baseDamage - defenseReduction) * diceMultiplier));

    // Executa Efeitos Especiais da Carta
    if (card.type === 'attack') {
      sounds.playSwordSlash();
      this.spawnParticles(target.x + target.width / 2, target.y + target.height / 2, '#e74c3c', 16);
      this.shakeCamera(6, 0.2);

      target.takeDamage(calculatedDamage);

      const critBanner = isCritical ? ' ⭐ CRÍTICO SUPREMO!' : '';
      this.logMessage(`⚔️ Você usou <b>${card.name}</b> com D6 <b>[${diceVal}]</b> causando <b>${calculatedDamage} de dano</b> a ${target.name}!${critBanner}`, isCritical ? 'log-critical' : 'log-player-attack');
      this.spawnFloatingText(`-${calculatedDamage}`, target.x + target.width / 2, target.y - 15, isCritical ? '#ffd700' : '#ff4757');

      if (isCritical) {
        this.player.restoreMP(5);
        this.logMessage('✨ O Crítico Supremo restaurou +5 de Mana para você!', 'log-heal');
      }
    } else if (card.type === 'defense') {
      // Postura Defensiva: Concede escudo temporário
      sounds.playShieldBlock();
      const shieldAmount = Math.round(card.power * diceMultiplier);
      this.player.shieldBuff = shieldAmount;
      this.logMessage(`🛡️ Você ativou <b>${card.name}</b> com D6 <b>[${diceVal}]</b>! Ganhou <b>+${shieldAmount} de Armadura</b>!`, 'log-defense');
      this.spawnFloatingText(`+${shieldAmount} Defesa`, this.player.x + 18, this.player.y - 15, '#54a0ff');
    } else if (card.type === 'special') {
      // Raio Arcano: Causa dano e pode atordoar
      sounds.playMagicSpell();
      this.spawnParticles(target.x + target.width / 2, target.y + target.height / 2, '#9b59b6', 20);
      target.takeDamage(calculatedDamage);
      this.spawnFloatingText(`-${calculatedDamage} ⚡`, target.x + target.width / 2, target.y - 15, '#ea80fc');

      let stunMsg = '';
      if (diceVal >= 4) {
        target.stunned = true;
        stunMsg = ' ⚡ O inimigo ficou ATORDIDO e não poderá contra-atacar!';
      }
      this.logMessage(`⚡ Você lançou <b>${card.name}</b> com D6 <b>[${diceVal}]</b> causando <b>${calculatedDamage} de dano</b>!${stunMsg}`, 'log-player-attack');
    } else if (card.type === 'recovery') {
      // Cura Sagrada
      sounds.playHeal();
      const healed = Math.round(card.power * diceMultiplier);
      this.player.heal(healed);
      this.logMessage(`💖 Você usou <b>${card.name}</b> com D6 <b>[${diceVal}]</b> e recuperou <b>+${healed} HP</b>!`, 'log-heal');
    }

    // 6. Reset do Dado e Preparação para o Próximo Turno
    this.dice.resetRoll();
    this.updateHoveredEnemy();

    // 7. CONTRA-ATAQUE DO INIMIGO (TURNO DO INIMIGO)
    if (!target.isDead && !target.stunned) {
      setTimeout(() => {
        if (!target.isDead && this.state === 'PLAYING') {
          this.executeEnemyTurn(target);
        }
      }, 700);
    } else if (target.stunned) {
      target.stunned = false; // Remove atordoamento após passar a vez
    }
  }

  executeEnemyTurn(enemy) {
    // Inimigo rola seu próprio D6 virtual
    const enemyRoll = Math.floor(Math.random() * 6) + 1;
    const enemyMult = (enemyRoll / 3.5);
    const playerDef = this.player.getTotalDefense();

    const rawDmg = Math.round(enemy.attack * enemyMult);
    const finalDmg = Math.max(1, Math.round(rawDmg - (playerDef * 0.45)));

    this.player.takeDamage(finalDmg);
    this.logMessage(`👹 <b>${enemy.name}</b> rolou D6 <b>[${enemyRoll}]</b> e contra-atacou desferindo <b>${finalDmg} de dano</b>!`, 'log-enemy-attack');

    // Reseta armadura temporária do jogador após o golpe
    this.player.shieldBuff = 0;
    this.updateHUD();
  }

  /* ========================================================================
     SISTEMA DE CARTAS DE HABILIDADE (RENDERIZAÇÃO E SELEÇÃO)
     ======================================================================== */
  renderCardsHand() {
    const container = document.getElementById('cards-hand');
    container.innerHTML = '';

    this.player.hand.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'rpg-card';
      if (this.player.selectedCard && this.player.selectedCard.id === card.id) {
        cardEl.classList.add('selected');
      }

      cardEl.innerHTML = `
        <div class="card-top-row">
          <span class="card-cost-badge">${card.cost} MP</span>
          <span class="card-type-tag type-${card.type}">${card.typeName}</span>
        </div>
        <div class="card-art-box">${card.icon}</div>
        <div class="card-title">${card.name}</div>
        <div class="card-stat-banner">${card.statDisplay}</div>
        <div class="card-desc">${card.desc}</div>
      `;

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectCard(card);
      });

      container.appendChild(cardEl);
    });
  }

  selectCard(card) {
    sounds.playClick();
    if (this.player.selectedCard && this.player.selectedCard.id === card.id) {
      this.player.selectedCard = null; // Deseleciona
    } else {
      this.player.selectedCard = card;
    }

    // Atualiza Checklist
    const checkCard = document.getElementById('check-card');
    const hint = document.getElementById('selected-card-hint');

    if (this.player.selectedCard) {
      checkCard.classList.add('ready');
      checkCard.querySelector('.check-icon').textContent = '✅';
      hint.textContent = `⚔️ Armada: ${this.player.selectedCard.name}`;
      hint.style.color = '#2ecc71';
    } else {
      checkCard.classList.remove('ready');
      checkCard.querySelector('.check-icon').textContent = '⚪';
      hint.textContent = '👉 Selecione uma carta para armar o ataque!';
      hint.style.color = '#f1c40f';
    }

    this.renderCardsHand();
    this.updateAttackStatus();
  }

  /* ========================================================================
     SISTEMA DE INVENTÁRIO E EQUIPAMENTOS (TECLA ESPAÇO)
     ======================================================================== */
  toggleInventory() {
    const modal = document.getElementById('inventory-modal');
    if (modal.classList.contains('hidden')) {
      sounds.playClick();
      this.showModal('inventory-modal');
      this.renderInventory();
    } else {
      this.hideModal('inventory-modal');
    }
  }

  renderInventory(category = 'all') {
    // 1. Atualiza Ficha do Personagem no Modal
    document.getElementById('sheet-hero-name').textContent = this.player.name;
    document.getElementById('sheet-hero-level').textContent = `Nível ${this.player.level} Guardião dos Dados`;
    document.getElementById('sheet-hero-xp').textContent = `XP: ${this.player.xp} / ${this.player.maxXp}`;
    document.getElementById('sheet-stat-hp').textContent = `${this.player.hp} / ${this.player.maxHp}`;
    document.getElementById('sheet-stat-mp').textContent = `${this.player.mp} / ${this.player.maxMp}`;
    document.getElementById('sheet-stat-atk').textContent = this.player.getTotalAttack();
    document.getElementById('sheet-stat-def').textContent = this.player.getTotalDefense();
    document.getElementById('sheet-stat-gold').textContent = this.player.gold;
    document.getElementById('sheet-stat-kills').textContent = this.player.enemiesDefeated;

    // 2. Atualiza Slots de Equipamentos
    ['weapon', 'shield', 'armor', 'accessory'].forEach(slot => {
      const item = this.player.equipment[slot];
      const nameEl = document.getElementById(`slot-${slot}-name`);
      const iconEl = document.getElementById(`slot-${slot}-icon`);
      if (item) {
        nameEl.textContent = item.name;
        iconEl.textContent = item.icon;
      } else {
        nameEl.textContent = 'Vazio';
        iconEl.textContent = '➕';
      }

      // Clique no slot para desequipar
      const slotEl = document.getElementById(`slot-${slot}`);
      slotEl.onclick = () => {
        if (item) this.player.unequipItem(slot);
      };
    });

    // 3. Renderiza Mochila de Itens
    const grid = document.getElementById('inventory-items-grid');
    grid.innerHTML = '';

    const filtered = this.player.inventory.filter(entry => {
      const item = DATABASE.items[entry.id];
      if (!item) return false;
      if (category === 'all') return true;
      return item.type === category;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 20px;">Nenhum item nesta categoria.</div>';
    }

    filtered.forEach(entry => {
      const item = DATABASE.items[entry.id];
      const slotEl = document.createElement('div');
      slotEl.className = 'inv-item-slot';
      slotEl.innerHTML = `
        <span>${item.icon}</span>
        ${entry.qty > 1 ? `<span class="item-count-badge">${entry.qty}</span>` : ''}
      `;

      slotEl.addEventListener('click', () => {
        document.querySelectorAll('.inv-item-slot').forEach(s => s.classList.remove('selected'));
        slotEl.classList.add('selected');
        this.inspectItem(entry.id);
      });

      grid.appendChild(slotEl);
    });
  }

  inspectItem(itemId) {
    const item = DATABASE.items[itemId];
    if (!item) return;

    document.getElementById('inspect-placeholder').classList.add('hidden');
    const details = document.getElementById('inspect-details');
    details.classList.remove('hidden');

    document.getElementById('inspect-icon').textContent = item.icon;
    document.getElementById('inspect-name').textContent = item.name;
    document.getElementById('inspect-type').textContent = item.type.toUpperCase();
    document.getElementById('inspect-desc').textContent = item.desc;
    document.getElementById('inspect-stats').textContent = item.statsText || '';

    const actionBtn = document.getElementById('btn-inspect-action');
    if (item.type === 'equipment') {
      actionBtn.textContent = 'Equipar';
      actionBtn.onclick = () => this.player.equipItem(itemId);
    } else if (item.type === 'consumable') {
      actionBtn.textContent = 'Usar';
      actionBtn.onclick = () => this.player.useConsumable(itemId);
    } else {
      actionBtn.textContent = 'Item Especial';
      actionBtn.onclick = null;
    }
  }

  /* ========================================================================
     INTERAÇÕES COM BAÚS E NPCS (TECLA E)
     ======================================================================== */
  handleInteraction() {
    const nearby = this.map.getNearbyInteractive(this.player);
    if (!nearby) return;

    if (nearby.type === 'chest') {
      const chest = nearby.data;
      chest.opened = true;
      sounds.playChestOpen();

      const lootContainer = document.getElementById('chest-loot-list');
      lootContainer.innerHTML = '';

      chest.loot.forEach(l => {
        if (l.type === 'item') {
          this.player.addItem(l.id, l.qty);
          const item = DATABASE.items[l.id];
          lootContainer.innerHTML += `<div class="loot-item-entry"><span>${item.icon} ${item.name}</span> <span>+${l.qty}x</span></div>`;
        } else if (l.type === 'gold') {
          this.player.gold += l.amount;
          lootContainer.innerHTML += `<div class="loot-item-entry"><span>🪙 Ouro</span> <span>+${l.amount}</span></div>`;
        }
      });

      this.showModal('chest-modal');
      this.updateHUD();
    } else if (nearby.type === 'npc') {
      const npc = nearby.data;
      sounds.playClick();
      document.getElementById('dialog-speaker-name').textContent = npc.name;
      document.getElementById('dialog-portrait').textContent = npc.avatar;
      document.getElementById('dialog-text').textContent = `"${npc.dialog}"`;
      this.showModal('dialog-modal');
    }
  }

  /* ========================================================================
     FEEDBACK, INTERFACE (HUD), NOTIFICAÇÕES E MODAIS
     ======================================================================== */
  updateHUD() {
    // 1. Barras de Vida e Mana
    const hpRatio = (this.player.hp / this.player.maxHp) * 100;
    const mpRatio = (this.player.mp / this.player.maxMp) * 100;
    const xpRatio = (this.player.xp / this.player.maxXp) * 100;

    document.getElementById('player-hp-bar').style.width = `${hpRatio}%`;
    document.getElementById('player-hp-text').textContent = `${this.player.hp} / ${this.player.maxHp}`;

    document.getElementById('player-mp-bar').style.width = `${mpRatio}%`;
    document.getElementById('player-mp-text').textContent = `${this.player.mp} / ${this.player.maxMp}`;

    document.getElementById('player-xp-bar').style.width = `${xpRatio}%`;
    document.getElementById('player-xp-text').textContent = `${this.player.xp} / ${this.player.maxXp} XP`;

    // 2. Badges de Nível, Ataque, Defesa, Ouro
    document.getElementById('player-level-badge').textContent = `Nv. ${this.player.level}`;
    document.getElementById('player-attack-stat').textContent = this.player.getTotalAttack();
    document.getElementById('player-defense-stat').textContent = this.player.getTotalDefense();
    document.getElementById('player-gold-stat').textContent = this.player.gold;
  }

  showToast(msg) {
    const toast = document.getElementById('combat-instruction-toast');
    document.getElementById('toast-message').innerHTML = msg;
    toast.style.animation = 'none';
    toast.offsetHeight; // trigger reflow
    toast.style.animation = 'slideInLeft 0.3s ease';
  }

  logMessage(html, cssClass = 'log-system') {
    const feed = document.getElementById('combat-log-feed');
    const entry = document.createElement('div');
    entry.className = `log-entry ${cssClass}`;
    entry.innerHTML = html;
    feed.appendChild(entry);
    feed.scrollTop = feed.scrollHeight;
  }

  spawnFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1,
      life: 0.9,
      maxLife: 0.9
    });
  }

  spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
        alpha: 1,
        life: 0.5
      });
    }
  }

  shakeCamera(intensity, duration) {
    this.camera.shakeIntensity = intensity;
    this.camera.shakeDuration = duration;
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.showModal('pause-modal');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.hideModal('pause-modal');
    }
  }

  triggerGameOver() {
    this.state = 'GAME_OVER';
    sounds.playDefeat();
    document.getElementById('game-over-screen').classList.remove('hidden');
  }

  triggerVictory() {
    this.state = 'VICTORY';
    sounds.playVictory();
    const recap = document.getElementById('victory-stats-recap');
    recap.innerHTML = `
      <div><b>Nível Final:</b> ${this.player.level}</div>
      <div><b>Inimigos Derrotados:</b> ${this.player.enemiesDefeated}</div>
      <div><b>Ouro Acumulado:</b> ${this.player.gold}</div>
    `;
    document.getElementById('victory-screen').classList.remove('hidden');
  }

  /* ========================================================================
     LOOP PRINCIPAL DO JOGO (REQUEST ANIMATION FRAME)
     ======================================================================== */
  gameLoop(timestamp) {
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.state === 'PLAYING') {
      this.update(dt);
    }
    this.draw();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    // 1. Atualiza Jogador
    this.player.update(dt, this.keys, this.map);

    // 2. Atualiza Inimigos
    this.enemies.forEach(enemy => enemy.update(dt, this.player, this.map));

    // 3. Atualiza Dica de Interação de Baús e NPCs
    const interactive = this.map.getNearbyInteractive(this.player);
    const prompt = document.getElementById('interaction-prompt');
    if (interactive) {
      prompt.classList.remove('hidden');
      document.getElementById('interaction-label').textContent = interactive.label;
    } else {
      prompt.classList.add('hidden');
    }

    // 4. Atualiza Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt / p.life;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Atualiza Textos Flutuantes
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 25 * dt;
      ft.alpha -= dt / ft.maxLife;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 6. Atualiza Câmera (Seguindo o Jogador com Suavidade)
    const targetCamX = (this.player.x + 18) - this.camera.width / 2;
    const targetCamY = (this.player.y + 20) - this.camera.height / 2;

    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    this.camera.y += (targetCamY - this.camera.y) * 0.1;

    // Limites da Câmera
    this.camera.x = Math.max(0, Math.min(this.map.pixelWidth - this.camera.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.map.pixelHeight - this.camera.height, this.camera.y));

    // Tremor de Tela
    if (this.camera.shakeDuration > 0) {
      this.camera.shakeDuration -= dt;
      const shakeOffset = (Math.random() - 0.5) * this.camera.shakeIntensity;
      this.camera.x += shakeOffset;
      this.camera.y += shakeOffset;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Renderiza o Mapa de Fundo
    this.map.draw(this.ctx, this.camera);

    // 2. Renderiza Entidades ordenadas por Y (Profundidade 2.5D correta)
    const renderables = [
      { y: this.player.y + this.player.height, draw: () => this.player.draw(this.ctx, this.camera) }
    ];

    this.enemies.forEach(enemy => {
      if (!enemy.isDead) {
        const isHovered = (this.hoveredEnemy === enemy);
        renderables.push({
          y: enemy.y + enemy.height,
          draw: () => enemy.draw(this.ctx, this.camera, isHovered)
        });
      }
    });

    renderables.sort((a, b) => a.y - b.y);
    renderables.forEach(r => r.draw());

    // 3. Renderiza Partículas
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x - this.camera.x, p.y - this.camera.y, p.size, p.size);
      this.ctx.restore();
    });

    // 4. Renderiza Textos de Dano Flutuantes
    this.floatingTexts.forEach(ft => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.fillStyle = ft.color;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 3;
      this.ctx.font = '900 15px Cinzel, sans-serif';
      this.ctx.textAlign = 'center';
      const sx = ft.x - this.camera.x;
      const sy = ft.y - this.camera.y;
      this.ctx.strokeText(ft.text, sx, sy);
      this.ctx.fillText(ft.text, sx, sy);
      this.ctx.restore();
    });
  }
}

// Inicializa o jogo quando o DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  window.rpgGame = new Game();
});

