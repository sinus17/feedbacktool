import React, { useState } from 'react';
import { Download, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const DatabaseBackup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSQLFromSchema = (schemaData: any): string => {
    const lines: string[] = [
      '-- Database schema backup',
      `-- Generated at ${new Date().toISOString()}`,
      '',
      '-- Enable required extensions',
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
      '',
      '-- Drop existing tables',
      ...(schemaData.tables || []).map((table: any) => 
        `DROP TABLE IF EXISTS public.${table.table_name} CASCADE;`
      ),
      '',
      '-- Create tables',
      ...(schemaData.tables || []).map((table: any) => {
        const columns = (table.columns || [])
          .map((col: any) => {
            let line = `  ${col.column_name} ${col.data_type}`;
            if (col.column_default) line += ` DEFAULT ${col.column_default}`;
            if (col.is_nullable === 'NO') line += ' NOT NULL';
            return line;
          })
          .join(',\n');

        return [
          `CREATE TABLE public.${table.table_name} (`,
          columns,
          ');'
        ].join('\n');
      }),
      '',
      '-- Create indexes',
      ...(schemaData.indexes || []).map((idx: any) => idx.indexdef + ';'),
      '',
      '-- Create foreign key constraints',
      ...(schemaData.foreign_keys || []).map((fk: any) => 
        `ALTER TABLE public.${fk.table_name} ` +
        `ADD CONSTRAINT ${fk.constraint_name} ` +
        `FOREIGN KEY (${fk.column_name}) ` +
        `REFERENCES public.${fk.referenced_table_name}(${fk.referenced_column_name});`
      ),
      '',
      '-- Create functions',
      ...(schemaData.functions || []).map((func: any) => 
        func.routine_definition ? 
        [
          `CREATE OR REPLACE FUNCTION ${func.routine_name}`,
          `RETURNS ${func.data_type}`,
          `LANGUAGE ${func.external_language}`,
          'AS $$',
          func.routine_definition,
          '$$;'
        ].join('\n') : ''
      ).filter(Boolean),
      '',
      '-- Create triggers',
      ...(schemaData.triggers || []).map((trigger: any) => 
        trigger.action_statement ? 
        [
          `CREATE TRIGGER ${trigger.trigger_name}`,
          `${trigger.action_timing} ${trigger.event_manipulation}`,
          `ON ${trigger.event_object_table}`,
          'FOR EACH ROW',
          `${trigger.action_statement};`
        ].join('\n') : ''
      ).filter(Boolean),
      '',
      '-- Enable RLS',
      ...(schemaData.tables || []).map((table: any) =>
        `ALTER TABLE public.${table.table_name} ENABLE ROW LEVEL SECURITY;`
      ),
      '',
      '-- Create RLS policies',
      ...(schemaData.policies || []).map((policy: any) => 
        policy.qual ? 
        [
          `CREATE POLICY "${policy.policyname}"`,
          `ON public.${policy.tablename}`,
          `FOR ${policy.cmd}`,
          `TO ${policy.roles.join(', ')}`,
          `USING (${policy.qual})`,
          policy.with_check ? `WITH CHECK (${policy.with_check});` : ';'
        ].join('\n') : ''
      ).filter(Boolean),
      '',
      '-- Grant permissions',
      'GRANT USAGE ON SCHEMA public TO anon, authenticated;',
      ...(schemaData.tables || []).map((table: any) =>
        `GRANT ALL ON public.${table.table_name} TO anon, authenticated;`
      ),
      '',
      '-- Notify PostgREST to reload schema',
      'NOTIFY pgrst, \'reload schema\';'
    ];

    return lines.join('\n');
  };

  const downloadBackup = async (format: 'json' | 'sql') => {
    try {
      setLoading(true);
      setError(null);

      // Get schema information using RPC call
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_schema_info', {}, {
          head: false
        });

      if (schemaError) {
        throw schemaError;
      }

      if (!schemaData) {
        throw new Error('No schema data returned');
      }

      // Generate content based on format
      const content = format === 'json' 
        ? JSON.stringify(schemaData, null, 2)
        : generateSQLFromSchema(schemaData);

      // Create and download file
      const blob = new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/plain'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-schema-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading schema:', err);
      setError(err instanceof Error ? err.message : 'Failed to download schema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Database Schema Backup</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Download a complete backup of the database schema including tables, policies, indexes, triggers, and functions.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => downloadBackup('json')}
          disabled={loading}
          className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Generating JSON...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download as JSON
            </>
          )}
        </button>

        <button
          onClick={() => downloadBackup('sql')}
          disabled={loading}
          className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Generating SQL...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download as SQL
            </>
          )}
        </button>
      </div>

      <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Backup Contents</h4>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>Table definitions and columns</li>
          <li>Row Level Security (RLS) policies</li>
          <li>Indexes and constraints</li>
          <li>Triggers and functions</li>
          <li>Foreign key relationships</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <strong>Note:</strong> The SQL backup includes all necessary commands to recreate the database schema, including DROP statements for safe recreation.
        </p>
      </div>
    </div>
  );
};