import { LawFirmMember } from '@/types';
export const demoTeam: LawFirmMember[] = [
 {id:'m1',name:'Murilo Guedes',email:'murilo@guedesadvocacia.com.br',area:'Trabalhista',role:'administrator',status:'active',assignedCases:12},
 {id:'m2',name:'Ana Souza',email:'ana@guedeslemos.com.br',area:'Consumidor',role:'lawyer',status:'active',assignedCases:8},
 {id:'m3',name:'Carlos Lima',email:'carlos@guedeslemos.com.br',area:'Previdenciário',role:'lawyer',status:'active',assignedCases:6},
 {id:'m4',name:'Júlia Mendes',email:'julia@guedeslemos.com.br',area:'Cível',role:'collaborator',status:'invited',assignedCases:3},
];
export const roleLabels={administrator:'Administrador',lawyer:'Advogado',collaborator:'Colaborador'};
