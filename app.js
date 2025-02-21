const { createApp } = Vue

createApp({
    data() {
        return {
            isFlipped: false,
            grade: '',
            unit: '',
            repeatCount: '',
            interval: '',
            words: [],
            currentWord: {},
            currentIndex: 0,
            isPlaying: false,
            timer: null,
            speechSynthesis: window.speechSynthesis,
            speechUtterance: null,
            theme: 'pink',
            dailyMotto: '',
            mottos: [
                '坚持就是胜利，每天进步一点点！',
                '学习英语，打开世界的大门！',
                '相信自己，你就是最棒的！',
                '今天的努力是明天的收获！',
                '勇敢面对困难，你一定能行！',
                '一分耕耘，一分收获！',
                '加油！我们一起成长！',
                '学习是快乐的，困难是暂时的！',
                '小小的进步，大大的欢喜！',
                '带着微笑，迎接每一次挑战！'
            ]
        }
    },
    computed: {
        canStart() {
            return this.grade && 
                   this.unit && 
                   this.repeatCount > 0 && 
                   this.interval > 0 && 
                   !this.isPlaying;
        }
    },
    created() {
        this.updateMotto();
        document.documentElement.setAttribute('data-theme', this.theme);
    },
    watch: {
        theme(newTheme) {
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    },
    methods: {
        updateMotto() {
            const randomIndex = Math.floor(Math.random() * this.mottos.length);
            this.dailyMotto = this.mottos[randomIndex];
        },
        async loadWords() {
            try {
                console.log('开始加载单词数据...');
                const response = await fetch('words1-6.xlsx');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const sheetName = workbook.SheetNames[0];
                console.log('找到工作表:', sheetName);
                const worksheet = workbook.Sheets[sheetName];
                
                // 添加更多的调试信息
                console.log('工作表内容:', worksheet);
                
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: true,
                    defval: '',
                    header: 1
                });
                
                console.log('转换后的JSON数据:', jsonData);
                
                // 跳过表头行
                const dataRows = jsonData.slice(1);
                
                // 假设Excel文件的列顺序为：grade、unit、word、chinese
                this.words = dataRows
                    .filter(row => {
                        if (!Array.isArray(row) || row.length < 4) {
                            console.log('跳过无效行:', row);
                            return false;
                        }
                    
                        const [grade, unit, word, chinese] = row;
                    
                        console.log('处理行数据:', {
                            grade: grade,
                            unit: unit,
                            word: word,
                            chinese: chinese
                        });
                    
                        const gradeMatch = String(grade).trim().toLowerCase() === String(this.grade).trim().toLowerCase();
                        // 从"Unit X"格式中提取数字
                        const unitNumber = String(unit).replace(/[^0-9]/g, '');
                        const unitMatch = parseInt(unitNumber) === parseInt(this.unit);
                    
                        console.log(`年级比较: [${grade}] vs [${this.grade}] = ${gradeMatch}`);
                        console.log(`单元比较: [${unit}] vs [${this.unit}] = ${unitMatch}`);
                    
                        return gradeMatch && unitMatch && word && chinese;
                    })
                    .map(row => ({
                        en: row[2],
                        cn: row[3]
                    }));
                
                console.log('过滤后的单词列表:', this.words);
                
                if (this.words.length === 0) {
                    alert(`未找到${this.grade}年级第${this.unit}单元的单词数据！请检查Excel文件格式是否正确。`);
                } else {
                    console.log(`成功加载${this.words.length}个单词`);
                }
            } catch (error) {
                console.error('加载单词数据失败：', error);
                alert('加载单词数据失败：' + error.message);
            }
        },
        flipCard() {
            this.isFlipped = !this.isFlipped;
        },
        showNextWord() {
            if (this.currentIndex >= this.words.length) {
                this.currentIndex = 0;
            }
            this.currentWord = this.words[this.currentIndex];
            this.currentIndex++;
            this.isFlipped = false;
            
            if (this.speechSynthesis) {
                const voices = this.speechSynthesis.getVoices();
                const britishVoice = voices.find(voice => 
                    voice.lang.includes('en-GB') && voice.name.includes('Female'));
                
                let repeatCount = 0;
                const speakWord = () => {
                    const utterance = new SpeechSynthesisUtterance(this.currentWord.en);
                    utterance.lang = 'en-GB';
                    utterance.voice = britishVoice;
                    
                    utterance.onend = () => {
                        repeatCount++;
                        if (repeatCount < parseInt(this.repeatCount)) {
                            setTimeout(speakWord, this.interval * 1000);
                        }
                    };
                    
                    this.speechSynthesis.speak(utterance);
                };
                
                speakWord();
            }
        },

        async start() {
            if (!this.canStart) return;
            
            await this.loadWords();
            if (this.words.length === 0) return;
        
            this.isPlaying = true;
            this.currentIndex = 0;
            
            const showWord = () => {
                this.showNextWord();
                
                this.currentWord.progress = `第${this.currentIndex}/${this.words.length}个单词`;
                
                if (this.currentIndex >= this.words.length) {
                    this.currentIndex = 0;
                }
                
                // 等待当前单词的所有重复读音完成后再显示下一个单词
                const totalDelay = this.repeatCount * this.interval * 1000;
                this.timer = setTimeout(showWord, totalDelay);
            };
        
            showWord();
        }, // 添加逗号

        reset() {
            // 停止所有朗读
            if (this.speechSynthesis) {
                this.speechSynthesis.cancel();
            }
            
            // 清除定时器
            clearTimeout(this.timer);
            
            // 重置所有状态
            this.grade = '';
            this.unit = '';
            this.repeatCount = '';
            this.interval = '';
            this.isFlipped = false;
            this.currentWord = {};
            this.currentIndex = 0;
            this.isPlaying = false;
            this.words = [];
            this.speechUtterance = null;
        }
    }
}).mount('#app')