<?php
class Validator {
    public static array $FACTOR_SCHEMA = [
        'INS'=>['label'=>'Sumber Daya','role'=>'owner','weight'=>0.20,'scale_max'=>3,'questions'=>[
            ['id'=>'ins_oh1','code'=>'OH-1','text'=>'Memiliki NIB?'],
            ['id'=>'ins_oh2','code'=>'OH-2','text'=>'Bantuan pendanaan pemerintah?'],
            ['id'=>'ins_oh3','code'=>'OH-3','text'=>'Mengikuti kegiatan pemerintah?'],
            ['id'=>'ins_oh4','code'=>'OH-4','text'=>'Kolaborasi dengan bisnis lain?'],
            ['id'=>'ins_oh5','code'=>'OH-5','text'=>'Menggunakan pemasaran digital?'],
            ['id'=>'ins_oh6','code'=>'OH-6','text'=>'Sumber modal keuangan utama?'],
        ]],
        'OPS'=>['label'=>'Inovasi','role'=>'owner','weight'=>0.15,'scale_max'=>5,'questions'=>[
            ['id'=>'ops_oh26','code'=>'OH-26','text'=>'Modal kerja mencukupi'],
            ['id'=>'ops_oh27','code'=>'OH-27','text'=>'Gaji karyawan tepat waktu'],
            ['id'=>'ops_oh28','code'=>'OH-28','text'=>'Peralatan/mesin optimal'],
            ['id'=>'ops_oh29','code'=>'OH-29','text'=>'Rantai pasokan lancar'],
            ['id'=>'ops_oh30','code'=>'OH-30','text'=>'Permintaan produk terprediksi'],
            ['id'=>'ops_oh31','code'=>'OH-31','text'=>'Hubungan pelanggan jangka panjang'],
        ]],
        'ECT'=>['label'=>'Eksternal','role'=>'owner','weight'=>0.15,'scale_max'=>5,'questions'=>[
            ['id'=>'ect_oh32','code'=>'OH-32','text'=>'Jangkauan pasar/pelanggan baru'],
            ['id'=>'ect_oh33','code'=>'OH-33','text'=>'Pertumbuhan penjualan memuaskan'],
            ['id'=>'ect_oh34','code'=>'OH-34','text'=>'Liabilitas/utang terkelola'],
            ['id'=>'ect_oh35','code'=>'OH-35','text'=>'Arus kas sehat & stabil'],
        ]],
        'OV'=>['label'=>'Budaya','role'=>'employee','weight'=>0.18,'scale_max'=>5,'questions'=>[
            ['id'=>'ov_oh18','code'=>'OH-18','text'=>'Bebas membicarakan kesulitan kerja'],
            ['id'=>'ov_oh19','code'=>'OH-19','text'=>'Suasana kerja positif'],
            ['id'=>'ov_oh20','code'=>'OH-20','text'=>'Semangat kerja tinggi'],
            ['id'=>'ov_oh21','code'=>'OH-21','text'=>'Karyawan saling membantu'],
            ['id'=>'ov_oh22','code'=>'OH-22','text'=>'Kepercayaan antar karyawan kuat'],
            ['id'=>'ov_oh23','code'=>'OH-23','text'=>'Kerja tim efektif'],
            ['id'=>'ov_oh24','code'=>'OH-24','text'=>'Saling menghormati'],
            ['id'=>'ov_oh25','code'=>'OH-25','text'=>'Pekerjaan sebagai dedikasi'],
        ]],
        'LDI'=>['label'=>'Kepemimpinan','role'=>'employee','weight'=>0.17,'scale_max'=>5,'questions'=>[
            ['id'=>'ldi_oh7','code'=>'OH-7','text'=>'Pemimpin terhubung personal'],
            ['id'=>'ldi_oh8','code'=>'OH-8','text'=>'Pemimpin sebagai panutan'],
            ['id'=>'ldi_oh9','code'=>'OH-9','text'=>'Pemimpin terbuka terhadap ide'],
            ['id'=>'ldi_oh10','code'=>'OH-10','text'=>'Pemimpin terlibat langsung'],
            ['id'=>'ldi_oh11','code'=>'OH-11','text'=>'Pemimpin melatih karyawan baru'],
            ['id'=>'ldi_oh12','code'=>'OH-12','text'=>'Pemimpin berlaku adil'],
        ]],
        'WEQ'=>['label'=>'Proses','role'=>'employee','weight'=>0.15,'scale_max'=>5,'questions'=>[
            ['id'=>'weq_oh13','code'=>'OH-13','text'=>'Bebas dari kecelakaan kerja'],
            ['id'=>'weq_oh14','code'=>'OH-14','text'=>'Puas dengan jam kerja'],
            ['id'=>'weq_oh15','code'=>'OH-15','text'=>'Beban kerja terkelola'],
            ['id'=>'weq_oh16','code'=>'OH-16','text'=>'Kondisi fisik nyaman'],
            ['id'=>'weq_oh17','code'=>'OH-17','text'=>'Karyawan jarang absen'],
        ]],
    ];

    private static array $ROLE_FACTORS = [
        'owner'=>['INS','ECT','OPS'],
        'employee'=>['OV','LDI','WEQ'],
    ];

    public static function validateSubmission(array $data, string $role): array {
        $errors=[]; $warnings=[];

        // Profile — hanya warning saat submit (sudah divalidasi saat registrasi)
        $name = trim($data['umkm_name']??'');
        if($name && mb_strlen($name)<2)
            $warnings[]=self::w('umkm_name','TOO_SHORT','Nama UMKM minimal 2 karakter.');

        $email = trim($data['email']??'');
        if($email && !filter_var($email,FILTER_VALIDATE_EMAIL))
            $warnings[]=self::w('email','INVALID_EMAIL','Format email tidak valid.');

        if(!in_array($role,['owner','employee']))
            $errors[]=self::e('role','INVALID_ROLE',"Peran '$role' tidak valid.");

        // Factors — INI yang menjadi penentu valid/tidak
        $required = self::$ROLE_FACTORS[$role]??[];
        $factorResults=[];
        foreach($required as $fKey) {
            $fr = self::validateFactor($fKey,$data);
            $factorResults[$fKey]=$fr;
            $errors=array_merge($errors,$fr['errors']);
            $warnings=array_merge($warnings,$fr['warnings']);
        }

        // Cross-factor
        $scores=[];
        foreach($factorResults as $k=>$r) if($r['normScore']!==null) $scores[$k]=$r['normScore'];
        if(count($scores)>=2) {
            $range=round(max($scores)-min($scores),4);
            if($range>0.5) {
                $hk=array_keys($scores,max($scores))[0]; $lk=array_keys($scores,min($scores))[0];
                $warnings[]=self::w(null,'DISPARITY',"Kesenjangan besar antara $hk (".round(max($scores)*100)."%) dan $lk (".round(min($scores)*100)."%).");
            }
        }

        $composite = self::computeComposite($factorResults);
        $clean = self::sanitize($data,$role,$required);
        return ['valid'=>empty($errors),'errors'=>$errors,'warnings'=>$warnings,
                'scores'=>self::formatScores($factorResults),'composite'=>$composite,
                'clean_data'=>$clean,'meta'=>['role'=>$role,'required_factors'=>$required,
                'total_errors'=>count($errors),'total_warnings'=>count($warnings)]];
    }

    private static function validateFactor(string $fKey, array $data): array {
        $factor=self::$FACTOR_SCHEMA[$fKey];
        $errors=[]; $warnings=[]; $rawVals=[]; $answered=0;
        foreach($factor['questions'] as $q) {
            $raw=$data[$q['id']]??null;
            if($raw===null||$raw==='') {
                $errors[]=self::e($q['id'],'MISSING',"{$q['code']}: \"{$q['text']}\" wajib dijawab.",$fKey);
                continue;
            }
            if(!is_numeric($raw)||!in_array((int)$raw,range(1,$factor['scale_max']))) {
                $errors[]=self::e($q['id'],'OUT_OF_RANGE',"{$q['code']}: Nilai $raw di luar rentang (1–{$factor['scale_max']}).",$fKey);
                continue;
            }
            $rawVals[]=(int)$raw; $answered++;
        }
        $total=count($factor['questions']);
        $pct=$total>0?round($answered/$total,4):0;
        if($answered>0&&$pct<0.8) $warnings[]=self::w($fKey,'LOW_COMPLETION',"Faktor $fKey: $answered/$total dijawab.",$fKey);
        if($answered>=4&&count(array_unique($rawVals))===1)
            $warnings[]=self::w($fKey,'STRAIGHT_LINE',"Faktor $fKey: semua jawaban identik ({$rawVals[0]}).",$fKey);
        $rawMean=$answered>0?round(array_sum($rawVals)/$answered,4):null;
        $normScore=$rawMean!==null?round($rawMean/$factor['scale_max'],4):null;
        return ['errors'=>$errors,'warnings'=>$warnings,'answered'=>$answered,'total'=>$total,
                'completionPct'=>$pct,'rawMean'=>$rawMean,'normScore'=>$normScore,'rawVals'=>$rawVals];
    }

    public static function computeComposite(array $factorResults): ?array {
        $ws=0; $wt=0;
        foreach($factorResults as $fKey=>$r) {
            if($r['normScore']===null) continue;
            $w=self::$FACTOR_SCHEMA[$fKey]['weight']; $ws+=$r['normScore']*$w; $wt+=$w;
        }
        if($wt===0) return null;
        $comp=round($ws/$wt,4); $s5=round($comp*5,2);
        $cats=[['label'=>'SANGAT BAIK','min'=>0.80],['label'=>'BAIK','min'=>0.60],
               ['label'=>'CUKUP','min'=>0.40],['label'=>'PERLU PERHATIAN','min'=>0.00]];
        $cat='PERLU PERHATIAN';
        foreach($cats as $c) { if($comp>=$c['min']){$cat=$c['label'];break;} }
        return ['composite'=>$comp,'scoreOn5'=>$s5,'category'=>$cat];
    }

    private static function sanitize(array $data, string $role, array $factors): array {
        $clean=['umkm_name'=>trim($data['umkm_name']??''),'email'=>strtolower(trim($data['email']??'')),
                'role'=>$role,'lokasi'=>trim($data['lokasi']??''),'sektor'=>trim($data['sektor']??''),
                'omzet'=>is_numeric($data['omzet']??'') ? (int)$data['omzet'] : null,'answers'=>[]];
        foreach($factors as $fKey) foreach(self::$FACTOR_SCHEMA[$fKey]['questions'] as $q) {
            $v=$data[$q['id']]??null;
            if($v!==null&&$v!=='') $clean['answers'][$q['id']]=(int)$v;
        }
        return $clean;
    }

    private static function formatScores(array $fr): array {
        $out=[];
        foreach($fr as $k=>$r) $out[$k]=['rawMean'=>$r['rawMean'],'normScore'=>$r['normScore'],
            'scoreOn5'=>$r['normScore']!==null?round($r['normScore']*5,2):null,
            'completionPct'=>$r['completionPct'],'answered'=>$r['answered'],'total'=>$r['total']];
        return $out;
    }

    private static function e(string $f, string $c, string $m, string $fk=''): array { return ['field'=>$f,'factor'=>$fk,'code'=>$c,'message'=>$m]; }
    private static function w(?string $f, string $c, string $m, string $fk=''): array { return ['field'=>$f,'factor'=>$fk,'code'=>$c,'message'=>$m]; }
}