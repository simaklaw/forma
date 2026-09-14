beep.wav — короткий (180мс, синус 880Гц, с fade-in/out против щелчков)
сигнал окончания отдыха, сгенерирован программно (не записан вручную).
Подключён в `ExerciseSheet.tsx` через
`RestTimerEngine.startTimer(seconds, onTick, onComplete, require('../../../assets/sfx/beep.wav'))`.

Если захотите заменить на более выразительный звук — просто перезапишите
этот файл (или добавьте `beep.mp3` и поменяйте расширение в require) любым
коротким (~150–250мс) файлом; сигнатура `RestTimerEngine.playBeep()` не
изменится.
