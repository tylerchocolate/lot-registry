'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../lib/supabase-browser';

const MINT='#90EE82',ORANGE='#F5921E',BORDER='#252525',CARD='#111',DIM='#777';

function SourceBadge({source,confidence}){
  if(!source||source==='manual') return null;
  const cfg={photo_ts:{label:'From photo timestamp',color:'#60a0ff',bg:'#0a1a2a',border:'#0a2a4a'},ocr_high:{label:'Auto-read',color:MINT,bg:'#0d2a0d',border:'#1a3a1a'},ocr_med:{label:'Verify reading',color:ORANGE,bg:'#2a1800',border:'#3a2200'},ocr_low:{label:'Manual entry required',color:'#ff6b6b',bg:'#2a0000',border:'#3a0000'},exif:{label:'From photo GPS/EXIF',color:MINT,bg:'#0d2a0d',border:'#1a3a1a'}};
  let key=source;
  if(source==='ocr'&&confidence==='high') key='ocr_high';
  if(source==='ocr'&&confidence==='medium') key='ocr_med';
  if(source==='ocr'&&confidence==='unreadable') key='ocr_low';
  const s=cfg[key]||cfg.ocr_high;
  return <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',padding:'2px 6px',borderRadius:3,whiteSpace:'nowrap',flexShrink:0,background:s.bg,color:s.color,border:'1px solid '+s.border}}>{s.label}</span>;
}

function Field({label,source,confidence,children}){
  return <div><div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}><label style={{fontSize:11,color:DIM,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em'}}>{label}</label><SourceBadge source={source} confidence={confidence}/></div>{children}</div>;
}

function Input({value,onChange,type='text',placeholder,readOnly}){
  const [f,setF]=useState(false);
  return <input type={type} value={value??''} onChange={e=>onChange&&onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:'100%',padding:'9px 12px',background:readOnly?'#0a0a0a':'#0d0d0d',border:'1px solid '+(f?MINT:BORDER),borderRadius:7,color:readOnly?'#666':'#e8e8e2',fontSize:13,outline:'none',boxSizing:'border-box',cursor:readOnly?'default':'text'}}/>;
}

function Textarea({value,onChange,placeholder,rows=3}){
  const [f,setF]=useState(false);
  return <textarea value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:'100%',padding:'9px 12px',background:'#0d0d0d',border:'1px solid '+(f?MINT:BORDER),borderRadius:7,color:'#e8e8e2',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>;
}

function Section({icon,title,children}){
  return <div style={{background:CARD,border:'1px solid '+BORDER,borderRadius:10,overflow:'hidden'}}><div style={{padding:'12px 20px',borderBottom:'1px solid '+BORDER,display:'flex',alignItems:'center',gap:9}}><span style={{color:MINT,fontSize:13}}>{icon}</span><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.09em',color:'#aaa'}}>{title}</span></div><div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>{children}</div></div>;
}

function StatTile({label,value,unit,source,confidence}){
  const empty=value==null||value==='';
  return <div style={{background:'#0a0a0a',border:'1px solid '+BORDER,borderRadius:8,padding:'12px 16px',display:'flex',flexDirection:'column',gap:4}}><div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}><span style={{fontSize:10,color:DIM,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600}}>{label}</span><SourceBadge source={source} confidence={confidence}/></div><div style={{fontSize:22,fontWeight:800,color:empty?'#333':'#fff',letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums'}}>{empty?'—':(value+(unit?' '+unit:''))}</div></div>;
}

function ReadingBreakdown({label,readings,valueKey,unit,extraLabel}){
  if(!readings) return null;
  const valid=readings.filter(r=>r[valueKey]!=null);
  if(!valid.length) return null;
  return <div style={{background:'#0a0a0a',border:'1px solid '+BORDER,borderRadius:7,padding:'12px 14px'}}><div style={{fontSize:10,color:DIM,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10,fontWeight:600}}>{label}</div><div style={{display:'flex',flexDirection:'column',gap:5}}>{valid.map((r,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:10,fontSize:13}}><span style={{color:'#555',minWidth:24}}>#{i+1}</span><span style={{color:'#fff',fontWeight:700,flex:1,fontVariantNumeric:'tabular-nums'}}>{r[valueKey]}{unit}{extraLabel&&r[extraLabel]&&<span style={{color:'#555',fontWeight:400,fontSize:11,marginLeft:6}}>({r[extraLabel]})</span>}</span><SourceBadge source='ocr' confidence={r.confidence}/></div>)}</div></div>;
}

function fmtDT(iso){if(!iso) return '';return new Date(iso).toLocaleString('es-CO',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
const g2={display:'grid',gridTemplateColumns:'1fr 1fr',gap:14};

export default function LotEditor({lot}){
  const router=useRouter();
  const wConf=lot.ocr_weight_confidence,tConf=lot.ocr_temp_confidence,mConf=lot.ocr_moisture_confidence;
  const [fields,setFields]=useState({
    farm_name:lot.farm_name??'',municipality:lot.municipality??'',department:lot.department??'',
    altitude:lot.altitude??'',producer:typeof lot.producer==='string'?lot.producer:(lot.producer?.name??''),
    farm_ica:lot.farm_ica??'',harvest_date:lot.harvest_date?lot.harvest_date.split('T')[0]:'',
    net_weight:lot.net_weight??'',gross_weight:lot.gross_weight??'',bag_count:lot.bag_count??'',
    fermentor_type:lot.fermentor_type??'',ferment_days:lot.ferment_days??'',turns:lot.turns??'',ferment_notes:lot.ferment_notes??'',
    dry_method:lot.dry_method??'',dry_days:lot.dry_days??'',final_moisture:lot.final_moisture??'',dry_notes:lot.dry_notes??'',
    buyer:lot.buyer??'',dispatch_date:lot.dispatch_date?lot.dispatch_date.split('T')[0]:'',
    transport_ref:lot.transport_ref??'',observations:lot.observations??'',status:lot.status??'registered',
  });
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState(null);
  const set=key=>val=>setFields(f=>({...f,[key]:val}));

  async function handleSave(){
    setSaving(true);setSaved(false);setError(null);
    const db=createBrowserClient();
    const {error:e}=await db.from('lots').update({
      farm_name:fields.farm_name||null,municipality:fields.municipality||null,department:fields.department||null,
      altitude:fields.altitude||null,producer:fields.producer||null,farm_ica:fields.farm_ica||null,
      harvest_date:fields.harvest_date||null,
      net_weight:fields.net_weight?Number(fields.net_weight):null,
      gross_weight:fields.gross_weight?Number(fields.gross_weight):null,
      bag_count:fields.bag_count?Number(fields.bag_count):null,
      fermentor_type:fields.fermentor_type||null,
      ferment_days:fields.ferment_days?Number(fields.ferment_days):null,
      turns:fields.turns?Number(fields.turns):null,
      ferment_notes:fields.ferment_notes||null,
      dry_method:fields.dry_method||null,
      dry_days:fields.dry_days?Number(fields.dry_days):null,
      final_moisture:fields.final_moisture?Number(fields.final_moisture):null,
      dry_notes:fields.dry_notes||null,
      buyer:fields.buyer||null,dispatch_date:fields.dispatch_date||null,
      transport_ref:fields.transport_ref||null,observations:fields.observations||null,
      status:fields.status,updated_at:new Date().toISOString(),
    }).eq('id',lot.id);
    if(e){setError(e.message);setSaving(false);return;}
    setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),3000);router.refresh();
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        <StatTile label='Received weight' value={lot.ocr_weight_kg}       unit='kg' source='ocr' confidence={wConf}/>
        <StatTile label='Max ferm. temp'  value={lot.ocr_max_temp_celsius} unit='°C' source='ocr' confidence={tConf}/>
        <StatTile label='Final moisture'  value={lot.ocr_moisture_percent} unit='%'  source='ocr' confidence={mConf}/>
      </div>

      <Section icon='◎' title='Origin'>
        <Field label='Farm / Association name'><Input value={fields.farm_name} onChange={set('farm_name')} placeholder='Finca La Esperanza'/></Field>
        <div style={g2}>
          <Field label='Municipality'><Input value={fields.municipality} onChange={set('municipality')} placeholder='La Palma'/></Field>
          <Field label='Department'><Input value={fields.department} onChange={set('department')} placeholder='Cundinamarca'/></Field>
        </div>
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../lib/supabase-browser';

const MINT='#90EE82',ORANGE='#F5921E',BORDER='#252525',CARD='#111',DIM='#777';

function SourceBadge({source,confidence}){
  if(!source||source==='manual') return null;
  const cfg={
    photo_ts:{label:'From photo timestamp',color:'#60a0ff',bg:'#0a1a2a',border:'#0a2a4a'},
    ocr_high:{label:'Auto-read',color:MINT,bg:'#0d2a0d',border:'#1a3a1a'},
    ocr_med:{label:'Verify reading',color:ORANGE,bg:'#2a1800',border:'#3a2200'},
    ocr_low:{label:'Manual entry required',color:'#ff6b6b',bg:'#2a0000',border:'#3a0000'},
    exif:{label:'From photo GPS/EXIF',color:MINT,bg:'#0d2a0d',border:'#1a3a1a'},
  };
  let key=source;
  if(source==='ocr'&&confidence==='high') key='ocr_high';
  if(source==='ocr'&&confidence==='medium') key='ocr_med';
  if(source==='ocr'&&confidence==='unreadable') key='ocr_low';
  const s=cfg[key]||cfg.ocr_high;
  return <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',padding:'2px 6px',borderRadius:3,whiteSpace:'nowrap',flexShrink:0,background:s.bg,color:s.color,border:'1px solid '+s.border}}>{s.label}</span>;
}

function Field({label,source,confidence,children}){
  return <div><div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}><label style={{fontSize:11,color:DIM,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em'}}>{label}</label><SourceBadge source={source} confidence={confidence}/></div>{children}</div>;
}

function Input({value,onChange,type='text',placeholder,readOnly}){
  const [f,setF]=useState(false);
  return <input type={type} value={value??''} onChange={e=>onChange&&onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:'100%',padding:'9px 12px',background:readOnly?'#0a0a0a':'#0d0d0d',border:'1px solid '+(f?MINT:BORDER),borderRadius:7,color:readOnly?'#666':'#e8e8e2',fontSize:13,outline:'none',boxSizing:'border-box',cursor:readOnly?'default':'text'}}/>;
}

function Textarea({value,onChange,placeholder,rows=3}){
  const [f,setF]=useState(false);
  return <textarea value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:'100%',padding:'9px 12px',background:'#0d0d0d',border:'1px solid '+(f?MINT:BORDER),borderRadius:7,color:'#e8e8e2',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>;
}

function Section({icon,title,children}){
  return <div style={{background:CARD,border:'1px solid '+BORDER,borderRadius:10,overflow:'hidden'}}><div style={{padding:'12px 20px',borderBottom:'1px solid '+BORDER,display:'flex',alignItems:'center',gap:9}}><span style={{color:MINT,fontSize:13}}>{icon}</span><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.09em',color:'#aaa'}}>{title}</span></div><div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>{children}</div></div>;
}

function StatTile({label,value,unit,source,confidence}){
  const empty=value==null||value==='';
  return <div style={{background:'#0a0a0a',border:'1px solid '+BORDER,borderRadius:8,padding:'12px 16px',display:'flex',flexDirection:'column',gap:4}}><div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}><span style={{fontSize:10,color:DIM,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600}}>{label}</span><SourceBadge source={source} confidence={confidence}/></div><div style={{fontSize:22,fontWeight:800,color:empty?'#333':'#fff',letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums'}}>{empty?'—':(value+(unit?' '+unit:''))}</div></div>;
}

function ReadingBreakdown({label,readings,valueKey,unit,extraLabel}){
  if(!readings) return null;
  const valid=readings.filter(r=>r[valueKey]!=null);
  if(!valid.length) return null;
  return <div style={{background:'#0a0a0a',border:'1px solid '+BORDER,borderRadius:7,padding:'12px 14px'}}><div style={{fontSize:10,color:DIM,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10,fontWeight:600}}>{label}</div><div style={{display:'flex',flexDirection:'column',gap:5}}>{valid.map((r,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:10,fontSize:13}}><span style={{color:'#555',minWidth:24}}>#{i+1}</span><span style={{color:'#fff',fontWeight:700,flex:1,fontVariantNumeric:'tabular-nums'}}>{r[valueKey]}{unit}{extraLabel&&r[extraLabel]&&<span style={{color:'#555',fontWeight:400,fontSize:11,marginLeft:6}}>({r[extraLabel]})</span>}</span><SourceBadge source='ocr' confidence={r.confidence}/></div>)}</div></div>;
}

function fmtDT(iso){if(!iso) return '';return new Date(iso).toLocaleString('es-CO',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
const g2={display:'grid',gridTemplateColumns:'1fr 1fr',gap:14};

export default function LotEditor({lot}){
  const router=useRouter();
  const wConf=lot.ocr_weight_confidence,tConf=lot.ocr_temp_confidence,mConf=lot.ocr_moisture_confidence;
  const [fields,setFields]=useState({
    farm_name:lot.farm_name??'',municipality:lot.municipality??'',department:lot.department??'',
    altitude:lot.altitude??'',producer:typeof lot.producer==='string'?lot.producer:(lot.producer?.name??''),
    farm_ica:lot.farm_ica??'',harvest_date:lot.harvest_date?lot.harvest_date.split('T')[0]:'',
    net_weight:lot.net_weight??'',gross_weight:lot.gross_weight??'',bag_count:lot.bag_count??'',
    fermentor_type:lot.fermentor_type??'',ferment_days:lot.ferment_days??'',turns:lot.turns??'',ferment_notes:lot.ferment_notes??'',
    dry_method:lot.dry_method??'',dry_days:lot.dry_days??'',final_moisture:lot.final_moisture??'',dry_notes:lot.dry_notes??'',
    buyer:lot.buyer??'',dispatch_date:lot.dispatch_date?lot.dispatch_date.split('T')[0]:'',
    transport_ref:lot.transport_ref??'',observations:lot.observations??'',status:lot.status??'registered',
  });
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState(null);
  const set=key=>val=>setFields(f=>({...f,[key]:val}));

  async function handleSave(){
    setSaving(true);setSaved(false);setError(null);
    const db=createBrowserClient();
    const {error:e}=await db.from('lots').update({
      farm_name:fields.farm_name||null,municipality:fields.municipality||null,department:fields.department||null,
      altitude:fields.altitude||null,producer:fields.producer||null,farm_ica:fields.farm_ica||null,
      harvest_date:fields.harvest_date||null,
      net_weight:fields.net_weight?Number(fields.net_weight):null,
      gross_weight:fields.gross_weight?Number(fields.gross_weight):null,
      bag_count:fields.bag_count?Number(fields.bag_count):null,
      fermentor_type:fields.fermentor_type||null,
      ferment_days:fields.ferment_days?Number(fields.ferment_days):null,
      turns:fields.turns?Number(fields.turns):null,
      ferment_notes:fields.ferment_notes||null,
      dry_method:fields.dry_method||null,
      dry_days:fields.dry_days?Number(fields.dry_days):null,
      final_moisture:fields.final_moisture?Number(fields.final_moisture):null,
      dry_notes:fields.dry_notes||null,
      buyer:fields.buyer||null,dispatch_date:fields.dispatch_date||null,
      transport_ref:fields.transport_ref||null,observations:fields.observations||null,
      status:fields.status,updated_at:new Date().toISOString(),
    }).eq('id',lot.id);
    if(e){setError(e.message);setSaving(false);return;}
    setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),3000);router.refresh();
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        <StatTile label='Received weight' value={lot.ocr_weight_kg}       unit='kg' source='ocr' confidence={wConf}/>
        <StatTile label='Max ferm. temp'  value={lot.ocr_max_temp_celsius} unit='°C' source='ocr' confidence={tConf}/>
        <StatTile label='Final moisture'  value={lot.ocr_moisture_percent} unit='%'  source='ocr' confidence={mConf}/>
      </div>
      <Section icon='◎' title='Origin'>
        <Field label='Farm / Association name'><Input value={fields.farm_name} onChange={set('farm_name')} placeholder='Finca La Esperanza'/></Field>
        <div style={g2}>
          <Field label='Municipality'><Input value={fields.municipality} onChange={set('municipality')} placeholder='La Palma'/></Field>
          <Field label='Department'><Input value={fields.department} onChange={set('department')} placeholder='Cundinamarca'/></Field>
        </div>
        <div style={g2}>
          <Field label='Altitude (masl)' source={lot.altitude?'exif':null}><Input value={fields.altitude} onChange={set('altitude')} placeholder='2631'/></Field>
          <Field label='Farm ICA number'><Input value={fields.farm_ica} onChange={set('farm_ica')} placeholder='ICA-2024-001'/></Field>
        </div>
        <Field label='Producer / Association'><Input value={fields.producer} onChange={set('producer')} placeholder='Asociación de Cacaoteros del Tequendama'/></Field>
      </Section>
      <Section icon='⚖' title='Reception & Weight'>
        <Field label='Harvest date'><Input type='date' value={fields.harvest_date} onChange={set('harvest_date')}/></Field>
        <div style={g2}>
          <Field label='Net weight (kg)' source={lot.net_weight!=null&&lot.ocr_weight_kg!=null?'ocr':null} confidence={wConf}><Input type='number' value={fields.net_weight} onChange={set('net_weight')} placeholder='kg from scale OCR'/></Field>
          <Field label='Gross weight (kg)'><Input type='number' value={fields.gross_weight} onChange={set('gross_weight')} placeholder='2460'/></Field>
        </div>
        <Field label='Bag count'><Input type='number' value={fields.bag_count} onChange={set('bag_count')} placeholder='60'/></Field>
        <ReadingBreakdown label='Scale readings · per receptacle' readings={lot.ocr_weight_readings} valueKey='weight_kg' unit=' kg'/>
      </Section>
      <Section icon='⟳' title='Fermentation'>
        <div style={g2}>
          <Field label='Start' source={lot.ferment_start_at?'photo_ts':null}><Input value={fmtDT(lot.ferment_start_at)} placeholder='From fermentation photos' readOnly/></Field>
          <Field label='End' source={lot.ferment_end_at?'photo_ts':null}><Input value={fmtDT(lot.ferment_end_at)} placeholder='From fermentation photos' readOnly/></Field>
        </div>
        <div style={g2}>
          <Field label='Fermentor type'><Input value={fields.fermentor_type} onChange={set('fermentor_type')} placeholder='Wooden box — double stage'/></Field>
          <Field label='Days' source={lot.ferment_days!=null&&lot.ferment_start_at?'photo_ts':null}><Input type='number' value={fields.ferment_days} onChange={set('ferment_days')} placeholder='6'/></Field>
        </div>
        <Field label='Turns'><Input type='number' value={fields.turns} onChange={set('turns')} placeholder='Number of turns'/></Field>
        <ReadingBreakdown label='Temperature readings · from photos' readings={lot.ocr_temp_readings} valueKey='temp_celsius' unit='°C' extraLabel='temp_type'/>
        <Field label='Notes'><Textarea value={fields.ferment_notes} onChange={set('ferment_notes')} placeholder='Fermentation notes…'/></Field>
      </Section>
      <Section icon='☉' title='Drying'>
        <div style={g2}>
          <Field label='Start' source={lot.dry_start_at?'photo_ts':null}><Input value={fmtDT(lot.dry_start_at)} placeholder='From drying photos' readOnly/></Field>
          <Field label='End' source={lot.dry_end_at?'photo_ts':null}><Input value={fmtDT(lot.dry_end_at)} placeholder='From drying photos' readOnly/></Field>
        </div>
        <div style={g2}>
          <Field label='Drying method'><Input value={fields.dry_method} onChange={set('dry_method')} placeholder='Solar + raised African beds'/></Field>
          <Field label='Days' source={lot.dry_days!=null&&lot.dry_start_at?'photo_ts':null}><Input type='number' value={fields.dry_days} onChange={set('dry_days')} placeholder='8'/></Field>
        </div>
        <ReadingBreakdown label='Moisture readings · from photos' readings={lot.ocr_moisture_readings} valueKey='moisture_percent' unit='%'/>
        <Field label='Final moisture (%)' source={lot.final_moisture!=null&&lot.ocr_moisture_percent!=null?'ocr':null} confidence={mConf}><Input type='number' value={fields.final_moisture} onChange={set('final_moisture')} placeholder='6.8'/></Field>
        <Field label='Notes'><Textarea value={fields.dry_notes} onChange={set('dry_notes')} placeholder='Drying notes…'/></Field>
      </Section>
      <Section icon='→' title='Dispatch & Buyer'>
        <Field label='Buyer'><Input value={fields.buyer} onChange={set('buyer')} placeholder='Altromercato'/></Field>
        <div style={g2}>
          <Field label='Dispatch date'><Input type='date' value={fields.dispatch_date} onChange={set('dispatch_date')}/></Field>
          <Field label='Transport reference'><Input value={fields.transport_ref} onChange={set('transport_ref')} placeholder='HLCU1234567890'/></Field>
        </div>
        <Field label='Observations'><Textarea value={fields.observations} onChange={set('observations')} placeholder='Additional observations…'/></Field>
      </Section>
      <Section icon='◆' title='Status'>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['registered','pending','packed','rejected'].map(s=>(<button key={s} onClick={()=>set('status')(s)} style={{padding:'8px 18px',borderRadius:8,border:'1px solid '+(fields.status===s?MINT:BORDER),background:fields.status===s?'#90EE8218':'transparent',color:fields.status===s?MINT:'#555',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>{s}</button>))}
        </div>
      </Section>
      {error&&<div style={{padding:'12px 16px',background:'rgba(255,80,80,0.07)',border:'1px solid rgba(255,80,80,0.2)',borderRadius:8,color:'#ff8080',fontSize:12}}>{error}</div>}
      <div style={{display:'flex',alignItems:'center',gap:12,paddingBottom:40}}>
        <button onClick={handleSave} disabled={saving} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 28px',background:saved?'#90EE8233':saving?'#90EE8266':MINT,color:saved?MINT:'#000',border:saved?'1px solid '+MINT:'none',borderRadius:8,fontSize:13,fontWeight:800,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',transition:'all .2s'}}>
          {saved?'✓ Saved':saving?'Saving…':'Save changes'}
        </button>
        {saved&&<span style={{fontSize:12,color:MINT}}>Changes saved</span>}
      </div>
    </div>
  );
        }
